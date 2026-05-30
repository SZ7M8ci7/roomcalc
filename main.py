import gspread
import os
from oauth2client.service_account import ServiceAccountCredentials

OUTPUT_STATUSES = {'記入済', '確認中', '確認済', 'masterコピー済', '公開済'}

PROJECT_ID = os.getenv('PROJECT_ID').replace('\\n', '\n')
PRIVATE_KEY_ID = os.getenv('PRIVATE_KEY_ID').replace('\\n', '\n')
PRIVATE_KEY = os.getenv('PRIVATE_KEY').replace('\\n', '\n')
CLIENT_EMAIL = os.getenv('CLIENT_EMAIL').replace('\\n', '\n')
CLIENT_ID = os.getenv('CLIENT_ID').replace('\\n', '\n')
CLIENT_X509_CERT_URL = os.getenv('CLIENT_X509_CERT_URL').replace('\\n', '\n')
try:
    # 認証情報の読み込み
    scope = ['https://www.googleapis.com/auth/spreadsheets.readonly']
    client_credentials = {
        "type": "service_account",
        "project_id": PROJECT_ID,
        "private_key_id": PRIVATE_KEY_ID,
        "private_key": PRIVATE_KEY,
        "client_email": CLIENT_EMAIL,
        "client_id": CLIENT_ID,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": CLIENT_X509_CERT_URL
    }

    creds = ServiceAccountCredentials._from_parsed_json_keyfile(client_credentials, scope, None, None)
    client = gspread.authorize(creds)
    # スプレッドシートのURLとタブIDを指定する
    furniture_spreadsheet_url = 'https://docs.google.com/spreadsheets/d/1WGAQSg0vKHhmy0T-uWunqXxCuoEinTTi12RrEcStj2o/edit?gid=579226666#gid=579226666'
    furniture_sheet_gid = 579226666
    series_sheet_gid = 342294489
    reference_spreadsheet_url = 'https://docs.google.com/spreadsheets/d/1p5CQHE-mHimEwpgAfU5BX9Fd4WMlfQAicTsq3icrYN0/edit?usp=sharing'

    # スプレッドシートのデータを取得する
    worksheet = client.open_by_url(furniture_spreadsheet_url).get_worksheet_by_id(furniture_sheet_gid)
    rows = worksheet.get_all_values()
except:
    import sys
    sys.exit()
# 取得したデータを処理する
with open('data.csv', mode='w', encoding='UTF-8') as file:
    count = 0
    for row in rows:
        if len(row) == 0:
            continue
        if len(row) <= 54:
            row += [''] * (55 - len(row))
        if row[2] == '' or row[2] == '名前' or row[1].strip() not in OUTPUT_STATUSES:
            continue
        line = ','.join([str(count)]+row[2:16]+[row[54]]) + '\r\n'
        line = line.replace('小型雑貨', '小物雑貨')
        file.write(line)
        count+=1

worksheet = client.open_by_url(furniture_spreadsheet_url).get_worksheet_by_id(series_sheet_gid)
rows = worksheet.get_all_values()

# 取得したデータを処理する
with open('series.csv', mode='w', encoding='UTF-8') as file:
    lines = []
    for row in rows:
        if len(row) <= 18:
            row += [''] * (19 - len(row))
        if row[0].strip() not in OUTPUT_STATUSES:
            continue
        if 'シリーズ' in row[2]:
            line = ','.join(row[2:19]) + '\r\n'
            lines.append(line)

    if len(lines) <= 3:
        raise ValueError('データ行数が3行以下のため終了します。')

    file.writelines(lines)

sheet_name = '参照用素材数計算'

# スプレッドシートのデータを取得する
worksheet = client.open_by_url(reference_spreadsheet_url).worksheet(sheet_name)
rows = worksheet.get_all_values()

with open('roomrank.csv', mode='w', encoding='UTF-8') as file:
    count = 0
    for row in rows:
        count+=1
        if count <= 22:
            continue
        if row[77].isdigit():
            line = ','.join(row[77:77+6]) + '\r\n'
            file.write(line)
