import csv
import io
import subprocess
import unittest

from furniture_corrections import correct_furniture_row


def historical_rows(revision):
    data = subprocess.check_output(['git', 'show', f'{revision}:data.csv'])
    return list(csv.reader(io.StringIO(data.decode('utf-8'))))


class FurnitureCorrectionsTest(unittest.TestCase):
    def test_regeneration_restores_only_reviewed_fields(self):
        before = {row[1]: row for row in historical_rows('ae05944^')}
        imported = historical_rows('ae05944')
        counts = {'max_owned': 0, 'install_area': 0, 'photos': 0}
        for row in imported:
            expected = list(row)
            old = before.get(row[1])
            if old:
                if row[3] in ('内観・外観：床', '内観・外観：壁紙', '内観・外観：前景') and old[15] != row[15]:
                    expected[15] = old[15]
                    counts['max_owned'] += 1
                if row[3] == '雑貨：衣装' and old[4] == '1' and row[4] == '':
                    expected[4] = '1'
                    counts['install_area'] += 1
                if row[1] in ('セベク 常夜の甲冑の写真①', 'セベク 常夜の甲冑の写真②'):
                    expected[9:11] = ['4', '2']
                    counts['photos'] += 1
            with self.subTest(name=row[1]):
                actual = correct_furniture_row(row)
                self.assertEqual(actual, expected)
                self.assertEqual(correct_furniture_row(actual), expected)
        self.assertEqual(counts, {'max_owned': 70, 'install_area': 12, 'photos': 2})

    def test_changed_ids_and_unrelated_updates_are_preserved(self):
        row = ['9999', '軽音部の壁', 'SR', '内観・外観：壁紙', '', '', '', '25', '', '18', '7', 'スタイリッシュ', 'ユニーク', 'なし', '軽音部シリーズ', '1']
        original = list(row)
        corrected = correct_furniture_row(row)
        self.assertEqual(corrected[:15], row[:15])
        self.assertEqual(corrected[15], '2')
        self.assertEqual(row, original)
        row[15] = '3'
        self.assertEqual(correct_furniture_row(row), row)


if __name__ == '__main__':
    unittest.main()
