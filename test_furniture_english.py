import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError

from update_furniture_english import Client, build_entries, fetch_rows, publish, FurnitureHTML, RobotsRules, valid_english_name, compatible_name


def row(japanese='机（白）', english='White Desk', id='1', page='Permanent Furniture'):
    return dict(japanese=japanese, english=english, id=id, page=page)


class EnglishNamesTests(unittest.TestCase):
    def test_normalized_name_and_html_entities(self):
        entries = build_entries(['机(白)', 'ない家具'], [row(english='White &amp; Gold Desk')])
        self.assertEqual(entries['机(白)']['english'], 'White & Gold Desk')
        self.assertNotIn('ない家具', entries)
        self.assertTrue(entries['机(白)']['source_url'].endswith('/Permanent_Furniture'))

    def test_ambiguous_names_ids_and_markup_are_not_guessed(self):
        for rows in [[row(), row(id='2')], [row(), row(english='Other Desk')],
                     [row(), row(japanese='別の家具')], [row(english='<script>bad</script>')],
                     [row(english='TBA')]]:
            self.assertEqual(build_entries(['机（白）'], rows), {})

    def test_duplicates_and_missing_id(self):
        self.assertEqual(len(build_entries(['机（白）'], [row(), row()])), 1)
        self.assertEqual(len(build_entries(['机（白）'], [row(id='')])), 1)

    def test_rendered_card_names_and_source_links(self):
        parser = FurnitureHTML('Permanent Furniture')
        parser.feed('<table class="card imgfit"><tr><th><div id="Wall"></div><p>Wall &amp; Frame<br><span>壁と額</span></p></th></tr><tr><td><img src="/images/Furniture_123.png"></td></tr></table>')
        self.assertEqual(parser.rows, [row('壁と額', 'Wall & Frame', '123')])
        parser.feed('<tr class="filter"><td data-sort-value="123"><a href="/wiki/Event/Furniture#Wall">Wall</a></td></tr>')
        self.assertIn('https://twistedwonderland.wiki.gg/wiki/Event/Furniture', parser.links)

    def test_repeated_robots_groups_and_wildcards(self):
        robots = RobotsRules('User-agent: *\nAllow: /\nUser-agent: OtherBot\nDisallow: /\nUser-agent: *\nDisallow: /api.php\nDisallow: /*?action=\nCrawl-delay: 30')
        self.assertFalse(robots.can_fetch('https://example.test/api.php?action=cargoquery'))
        self.assertFalse(robots.can_fetch('https://example.test/wiki/Page?action=edit'))
        self.assertTrue(robots.can_fetch('https://example.test/wiki/Page'))
        self.assertEqual(robots.delay, 30)

    def test_missing_image_upload_link_does_not_become_part_of_name(self):
        parser = FurnitureHTML('Furniture Data')
        parser.feed('''<tr class="filter"><td data-sort-value="31310">
          <div><a href="/wiki/Special:Upload?wpDestFile=Furniture_31310.png"
          title="File:Furniture 31310.png">File:Furniture 31310.png</a></div>
          <a href="/wiki/Azul_Ashengrotto/Cards/SSR_Cozy_Loungewear#Photo_1">Azul Cozy <span>Loungewear</span> Photo 1</a>
          </td><td>Photos</td></tr>''')
        self.assertEqual(parser.index_rows, [dict(id='31310',
            page='Azul Ashengrotto/Cards/SSR Cozy Loungewear', english='Azul Cozy Loungewear Photo 1')])
        self.assertEqual(len(parser.links), 1)
        self.assertTrue(all('Special:' not in link for link in parser.links))

    def test_image_links_and_unlinked_text_are_not_names(self):
        parser = FurnitureHTML('Furniture Data')
        parser.feed('''<tr class="filter"><td data-sort-value="1">
          <a href="/wiki/Permanent_Furniture#Desk"><img alt="Furniture_1.png" src="/images/Furniture_1.png"></a>
          <a href="/wiki/File:Furniture_1.png">File:Furniture 1.png</a>
          file fallback <a href="/wiki/Permanent_Furniture#Desk">White &amp; Gold Desk</a>
          </td></tr><tr class="filter"><td data-sort-value="2">File:Furniture 2.png</td></tr>''')
        self.assertEqual(len(parser.index_rows), 1)
        self.assertEqual(parser.index_rows[0]['english'], 'White & Gold Desk')

    def test_ambiguous_links_are_not_concatenated_or_guessed(self):
        parser = FurnitureHTML('Furniture Data')
        parser.feed('''<tr class="filter"><td data-sort-value="1">
          <a href="/wiki/Event/Furniture#Desk">Desk</a>
          <a href="/wiki/Event/Furniture#Wall">Wall</a></td></tr>''')
        self.assertEqual(parser.index_rows, [])

    def test_filename_names_and_swapped_wall_floor_are_rejected(self):
        for english in ('File:Furniture 123.pngWhite Desk', 'Furniture_123',
                        'Furniture 123.png', 'Furniture 123.pngWhite Desk', 'https://example.test/Desk', 'Image:Desk'):
            with self.subTest(english=english):
                self.assertEqual(build_entries(['机（白）'], [row(english=english)]), {})
        self.assertEqual(build_entries(['クリスマス・タウンの床'],
            [row('クリスマス・タウンの床', 'Christmas Town Wall')]), {})
        self.assertEqual(build_entries(['クリスマス・タウンの壁'],
            [row('クリスマス・タウンの壁', 'Christmas Town Floor')]), {})
        self.assertEqual(build_entries(['KB-RS01&02'], [row('KB-RS01&02', 'KB-RS01&02')])['KB-RS01&02']['english'], 'KB-RS01&02')

    def test_published_dictionary_contains_no_invalid_names(self):
        dictionary = json.loads(Path(__file__).with_name('furniture_english.json').read_text(encoding='utf-8'))
        for japanese, entry in dictionary['entries'].items():
            with self.subTest(japanese=japanese):
                self.assertTrue(valid_english_name(entry['english']))
                self.assertTrue(compatible_name(japanese, entry['english']))

    def test_incremental_update_repairs_dirty_names_and_removes_unconfirmed_ones(self):
        with tempfile.TemporaryDirectory() as folder:
            data, output = Path(folder)/'data.csv', Path(folder)/'names.json'
            names = ['家具' + str(i) for i in range(10)]
            data.write_text(''.join(f'{i},{name}\n' for i, name in enumerate(names)), encoding='utf-8')
            entries = {name: {'english': 'Desk ' + str(i), 'wiki_id': str(i), 'source_url': 'source'}
                       for i, name in enumerate(names)}
            entries[names[0]]['english'] = 'File:Furniture 0.pngDesk Zero'
            entries[names[1]]['english'] = 'File:Furniture 1.png'
            output.write_text(json.dumps({'entries': entries}), encoding='utf-8')
            publish([row(names[0], 'Desk Zero', '0')] * 100, data, output, incremental=True)
            actual = json.loads(output.read_text(encoding='utf-8'))['entries']
            self.assertEqual(actual[names[0]]['english'], 'Desk Zero')
            self.assertNotIn(names[1], actual)
            self.assertEqual(actual[names[2]], entries[names[2]])

    def test_bounded_page_rotation_and_no_api_requests(self):
        class FakeClient:
            delay = 15
            def __init__(self): self.urls = []
            def get(self, url):
                self.urls.append(url)
                if url.endswith('/robots.txt'):
                    return 'User-agent: *\nDisallow: /api.php\nCrawl-delay: 20'
                if url.endswith('/Furniture_Data'):
                    return ''.join(f'<tr class="filter"><td data-sort-value="{i}"><a href="/wiki/Event{i}/Furniture">Name</a></td></tr>' for i in range(12))
                return '<table class="card imgfit"><tr><th>Desk<br>机</th></tr></table>'
        client = FakeClient()
        self.assertEqual(len(fetch_rows(client)), 5)
        self.assertEqual(len(client.urls), 7)
        self.assertEqual(client.delay, 20)
        self.assertTrue(all('/api.php' not in url for url in client.urls))
        refreshed = fetch_rows(FakeClient(), {'既存の家具': {'wiki_id': '0', 'english': 'Old name'}})
        self.assertEqual(refreshed[-1]['japanese'], '既存の家具')
        self.assertEqual(refreshed[-1]['english'], 'Name')

    def test_disallowed_robots_stops_before_fetching_pages(self):
        class Client:
            delay = 15
            calls = 0
            def get(self, url):
                self.calls += 1
                return 'User-agent: *\nDisallow: /'
        client = Client()
        with self.assertRaisesRegex(ValueError, 'robots.txt'):
            fetch_rows(client)
        self.assertEqual(client.calls, 1)

    def test_conditional_cache_and_rate_limit(self):
        class Response:
            headers = {'ETag': 'test-etag'}
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self, size): return b'{"test":1}'
        with tempfile.TemporaryDirectory() as folder:
            client = Client(Path(folder))
            client.delay = 0
            with patch('update_furniture_english.urlopen', return_value=Response()):
                self.assertEqual(client.get('https://example.test'), '{"test":1}')
            with patch('update_furniture_english.urlopen', side_effect=HTTPError('url',304,'unchanged',{},None)) as request:
                self.assertEqual(client.get('https://example.test'), '{"test":1}')
                self.assertEqual(request.call_args.args[0].get_header('If-none-match'), 'test-etag')
            with patch('update_furniture_english.urlopen', side_effect=HTTPError('url',429,'stop',{},None)) as request:
                with self.assertRaises(HTTPError): client.get('https://example.test')
                self.assertEqual(request.call_count, 1)

    def test_incremental_pages_preserve_other_furniture_and_update_matches(self):
        with tempfile.TemporaryDirectory() as folder:
            data, output = Path(folder)/'data.csv', Path(folder)/'names.json'
            data.write_text('0,机（白）\n1,壁\n', encoding='utf-8')
            publish([row()] * 999 + [row('壁', 'Wall', '2')], data, output)
            publish([row(english='Updated Desk')] * 100, data, output, incremental=True)
            entries = json.loads(output.read_text(encoding='utf-8'))['entries']
            self.assertEqual(entries['壁']['english'], 'Wall')
            self.assertEqual(entries['机（白）']['english'], 'Updated Desk')

    def test_no_change_no_rewrite_and_incomplete_data_preserves_output(self):
        with tempfile.TemporaryDirectory() as folder:
            data, output = Path(folder)/'data.csv', Path(folder)/'names.json'
            data.write_text('0,机（白）\n', encoding='utf-8')
            publish([row()] * 1000, data, output)
            original, modified = output.read_bytes(), output.stat().st_mtime_ns
            publish([row()] * 1000, data, output)
            self.assertEqual(output.stat().st_mtime_ns, modified)
            with self.assertRaises(ValueError): publish([row()], data, output)
            self.assertEqual(output.read_bytes(), original)


if __name__ == '__main__': unittest.main()
