"""Fetch permitted public furniture pages politely; publish unambiguous names."""
import argparse
import csv
import hashlib
import html
import json
import os
import re
import time
import unicodedata
from collections import defaultdict
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote, unquote, urlsplit
from html.parser import HTMLParser
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent
BASE = 'https://twistedwonderland.wiki.gg'
AGENT = 'TwstRoomFurnitureNames/1.0 (+https://github.com/SZ7M8ci7/roomcalc)'


def normalize(value):
    return re.sub(r'\s+', '', unicodedata.normalize('NFKC', value))


def clean(value):
    if not isinstance(value, str):
        raise ValueError('Unexpected source field type')
    return html.unescape(value).strip()


def valid_english_name(value):
    """Reject source markup, image fallbacks and placeholders, never trim them into names."""
    return bool(value and value.lower() not in {'tba', 'tbd', 'unknown', 'n/a', '-'} and
                re.search(r'[A-Za-z]', value) and
                not re.search(r'[<>\[\]{}\n\r_]|(?:file|image|https?):|\.(?:png|jpe?g|webp|gif|svg)', value, re.I))


def compatible_name(japanese, english):
    # Known upstream Japanese wall/floor labels can be swapped; leave these unconfirmed.
    return not ((japanese.endswith('の壁') and re.search(r'\bFloor$', english, re.I)) or
                (japanese.endswith('の床') and re.search(r'\bWall$', english, re.I)))


def atomic_json(path, value):
    text = json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + '\n'
    if path.exists() and path.read_text(encoding='utf-8') == text:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(text, encoding='utf-8')
    os.replace(temporary, path)


class Client:
    def __init__(self, cache):
        self.cache = cache
        self.delay = 15
        self.last_request = None

    def get(self, url):
        """Conditional HTTP requests; no automatic retries, including 429/503."""
        path = self.cache / (hashlib.sha256(url.encode()).hexdigest() + '.json')
        cached = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
        headers = {'User-Agent': AGENT, 'Accept': 'application/json,text/plain'}
        if cached.get('etag'):
            headers['If-None-Match'] = cached['etag']
        if cached.get('modified'):
            headers['If-Modified-Since'] = cached['modified']
        if self.last_request is not None:
            time.sleep(max(0, self.delay - (time.monotonic() - self.last_request)))
        self.last_request = time.monotonic()
        try:
            with urlopen(Request(url, headers=headers), timeout=30) as response:
                body = response.read(16_000_001)
                if len(body) > 16_000_000:
                    raise ValueError('Source response too large')
                value = {'body': body.decode('utf-8'), 'etag': response.headers.get('ETag'),
                         'modified': response.headers.get('Last-Modified')}
        except HTTPError as error:
            if error.code == 304 and 'body' in cached:
                error.close()
                return cached['body']
            error.close()
            raise
        atomic_json(path, value)
        return value['body']


class RobotsRules:
    """Merge matching robots groups (including repeated User-agent: * groups)."""
    def __init__(self, text):
        self.groups = []
        agents, rules, delay = [], [], 0
        for raw in text.splitlines() + ['User-agent: end-of-file']:
            line = raw.split('#', 1)[0].strip()
            if ':' not in line:
                continue
            key, value = (x.strip() for x in line.split(':', 1))
            key = key.lower()
            if key == 'user-agent':
                if rules:
                    self.groups.append((agents, rules, delay))
                    agents, rules, delay = [], [], 0
                agents.append(value.lower())
            elif key in ('allow', 'disallow') and value:
                rules.append((key == 'allow', value))
            elif key == 'crawl-delay':
                delay = max(delay, float(value))
        specific = [g for g in self.groups if any(a != '*' and a in AGENT.lower() for a in g[0])]
        self.selected = specific or [g for g in self.groups if '*' in g[0]]
        self.delay = max([g[2] for g in self.selected] + [15])

    def can_fetch(self, url):
        parts = urlsplit(url)
        target = parts.path + ('?' + parts.query if parts.query else '')
        matches = []
        for _, rules, _ in self.selected:
            for allow, pattern in rules:
                terminal = pattern.endswith('$')
                pattern = pattern[:-1] if terminal else pattern
                expression = '^' + '.*'.join(re.escape(p) for p in pattern.split('*')) + ('$' if terminal else '')
                if re.search(expression, target):
                    matches.append((len(pattern.replace('*', '')), allow))
        return max(matches)[1] if matches else True


class FurnitureHTML(HTMLParser):
    """Read names from rendered furniture cards and links from the public index."""
    def __init__(self, page):
        super().__init__()
        self.page, self.rows, self.links = page, [], set()
        self.index_rows, self.index_candidates, self.index_item = [], [], {}
        self.index_anchor = None
        self.depth = 0
        self.card = None
        self.header = False
        self.parts = []
        self.index_row = False
        self.first_cell = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'tr':
            self.index_row = 'filter' in attrs.get('class', '').split()
        if tag == 'td' and self.index_row and 'data-sort-value' in attrs:
            self.first_cell = True
            self.index_item = {'id': attrs['data-sort-value'], 'page': ''}
            self.index_candidates = []
            self.index_anchor = None
        if tag == 'a' and self.first_cell:
            href = attrs.get('href', '').split('#', 1)[0]
            if href.startswith('/wiki/') and ':' not in unquote(href[6:]) and '?' not in href:
                self.index_anchor = {'page': unquote(href[6:]).replace('_', ' '),
                                     'url': BASE + href, 'parts': []}
        if tag == 'table':
            self.depth += 1
            if self.card is None and 'card' in attrs.get('class', '').split():
                self.card = {'id': '', 'page': self.page, 'depth': self.depth}
                self.parts = []
        if self.card is not None:
            if tag == 'th' and 'english' not in self.card:
                self.header = True
            if tag == 'br' and self.header:
                self.parts.append('\x00')
            if tag == 'img':
                match = re.search(r'Furniture_(\d+)\.png', attrs.get('src', ''))
                if match and not self.card['id']:
                    self.card['id'] = match.group(1)

    def handle_data(self, text):
        if self.first_cell and self.index_anchor is not None:
            self.index_anchor['parts'].append(text)
        if self.header:
            self.parts.append(text)

    def handle_endtag(self, tag):
        if tag == 'a' and self.index_anchor is not None:
            anchor = self.index_anchor
            english = ' '.join(''.join(anchor['parts']).split())
            if valid_english_name(english):
                self.index_candidates.append(dict(self.index_item, page=anchor['page'], english=english))
                self.links.add(anchor['url'])
            self.index_anchor = None
        if tag == 'td':
            if self.first_cell:
                identities = {(r['page'], r['english']) for r in self.index_candidates}
                if len(identities) == 1:
                    self.index_rows.append(self.index_candidates[0])
            self.first_cell = False
            self.index_anchor = None
        if tag == 'th' and self.header:
            self.header = False
            names = ''.join(self.parts).split('\x00')
            self.card['english'] = ' '.join(names[0].split())
            self.card['japanese'] = ' '.join(' '.join(names[1:]).split())
        if tag == 'table':
            if self.card is not None and self.depth == self.card['depth']:
                if self.card.get('japanese'):
                    self.rows.append({k: self.card[k] for k in ('id', 'page', 'english', 'japanese')})
                self.card = None
            self.depth -= 1


def fetch_rows(client, existing=None):
    robots = RobotsRules(client.get(BASE + '/robots.txt'))
    client.delay = robots.delay
    index_url = BASE + '/wiki/Furniture_Data'
    if not robots.can_fetch(index_url):
        raise ValueError('robots.txt does not permit the furniture index')
    index = FurnitureHTML('Furniture_Data')
    index.feed(client.get(index_url))
    if len(index.links) < 10:
        raise ValueError('Furniture index format changed; published data unchanged')
    # A bounded rotation, independent of cache eviction, covers event/card pages too.
    from datetime import datetime, timezone
    week = (datetime.now(timezone.utc).date().toordinal() // 7)
    pages = sorted(u for u in index.links if robots.can_fetch(u) and u != BASE + '/wiki/Permanent_Furniture')
    chosen = [pages[(week * 4 + i) % len(pages)] for i in range(min(4, len(pages)))]
    chosen.insert(0, BASE + '/wiki/Permanent_Furniture')
    rows = []
    for url in chosen:
        if not robots.can_fetch(url):
            raise ValueError('robots.txt does not permit a selected furniture page')
        parser = FurnitureHTML(unquote(urlsplit(url).path[6:]).replace('_', ' '))
        parser.feed(client.get(url))
        if not parser.rows:
            raise ValueError('Furniture card format changed or empty page: ' + url)
        rows.extend(parser.rows)
        print(f'Fetched {len(parser.rows)} names from {url}', flush=True)
    # Refresh known English names by stable wiki ID from the single public index.
    by_id = defaultdict(list)
    for item in index.index_rows:
        if item['id'] and item['english']:
            by_id[item['id']].append(item)
    for name, entry in (existing or {}).items():
        matches = by_id.get(entry['wiki_id'], [])
        if len({r['english'] for r in matches}) == 1:
            rows.append(dict(matches[0], japanese=name))
    return rows


def build_entries(local_names, rows):
    by_name, by_id = defaultdict(list), defaultdict(set)
    for raw in rows:
        row = {key: clean(raw[key]) for key in ('id', 'english', 'japanese', 'page')}
        row['id'] = row['id'].replace(',', '')
        if row['japanese']:
            by_name[normalize(row['japanese'])].append(row)
            if row['id']:
                by_id[row['id']].add(normalize(row['japanese']))
    entries = {}
    for name in sorted(set(local_names)):
        matches = by_name.get(normalize(name), [])
        if not matches:
            continue
        identities = {(r['id'], r['english']) for r in matches}
        if len(identities) != 1:
            continue
        row = sorted(matches, key=lambda r: r['page'])[0]
        english = row['english']
        if (not valid_english_name(english) or not compatible_name(name, english) or
                (row['id'] and len(by_id[row['id']]) > 1)):
            continue
        entries[name] = {'english': english, 'wiki_id': row['id'],
                         'source_url': BASE + '/wiki/' + quote(row['page'].replace(' ', '_'), safe='/')}
    return entries


def publish(rows, data, output, incremental=False):
    with data.open(encoding='utf-8-sig', newline='') as source:
        names = [row[1] for row in csv.reader(source) if len(row) > 1]
    previous = json.loads(output.read_text(encoding='utf-8')) if output.exists() else {}
    if incremental:
        # Check new identities against previously verified Japanese/ID pairs too.
        fresh_names = {normalize(r['japanese']) for r in rows}
        baseline = [dict(id=e['wiki_id'], english=e['english'], japanese=name, page='')
                    for name, e in previous.get('entries', {}).items() if normalize(name) not in fresh_names]
        updates = build_entries(names, baseline + rows)
        updates = {name: entry for name, entry in updates.items() if normalize(name) in fresh_names}
        entries = {name: entry for name, entry in previous.get('entries', {}).items()
                   if name in names and valid_english_name(entry['english']) and compatible_name(name, entry['english'])}
        entries.update(updates)
    else:
        entries = build_entries(names, rows)
    # Never replace a working dictionary with a truncated/empty upstream response.
    if (len(rows) < (100 if incremental else 1000)) or not entries or len(entries) < len(previous.get('entries', {})) * .8:
        raise ValueError('Unexpected source/coverage decrease; published data unchanged')
    result = {'schema_version': 1, 'source_url': BASE + '/wiki/Furniture_Data', 'entries': entries}
    atomic_json(output, result)
    print(f'English names: {len(entries)}/{len(names)}; unmatched: {len(names) - len(entries)}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache-dir', type=Path, default=ROOT / '.cache/furniture-english')
    parser.add_argument('--source-json', type=Path, help='Offline Cargo row fixture (no HTTP requests)')
    parser.add_argument('--data', type=Path, default=ROOT / 'data.csv')
    parser.add_argument('--output', type=Path, default=ROOT / 'furniture_english.json')
    args = parser.parse_args()
    previous = json.loads(args.output.read_text(encoding='utf-8')).get('entries', {}) if args.output.exists() else {}
    rows = json.loads(args.source_json.read_text(encoding='utf-8')) if args.source_json else fetch_rows(Client(args.cache_dir), previous)
    publish(rows, args.data, args.output, incremental=not args.source_json)


if __name__ == '__main__':
    main()
