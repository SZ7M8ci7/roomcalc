"""スプレッドシートの既知の巻き戻りを、家具名と列を限定して補正する。"""

import json
from pathlib import Path


CORRECTIONS = json.loads(
    Path(__file__).with_name('furniture_corrections.json').read_text(encoding='utf-8')
)
COLUMNS = {'install_area': 4, 'theme_main': 9, 'theme_sub': 10, 'max_owned': 15}


def correct_furniture_row(row):
    """CSV形式の行を補正する。ID変更の影響を避けるため家具名で照合する。"""
    corrected = list(row)
    for field, rule in CORRECTIONS.get(corrected[1], {}).items():
        column = COLUMNS[field]
        # 既知の誤値だけを置換し、それ以外の新しい値はそのまま取り込む。
        if corrected[column] == rule['from']:
            corrected[column] = rule['to']
    return corrected
