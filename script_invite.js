Math.random.seed = (function me (s) {
	// Xorshift128 (init seed with Xorshift32)
	s ^= s << 13; s ^= 2 >>> 17; s ^= s << 5;
	let x = 123456789^s;
	s ^= s << 13; s ^= 2 >>> 17; s ^= s << 5;
	let y = 362436069^s;
	s ^= s << 13; s ^= 2 >>> 17; s ^= s << 5;
	let z = 521288629^s;
	s ^= s << 13; s ^= 2 >>> 17; s ^= s << 5;
	let w = 88675123^s;
	let t;
	Math.random = function () {
		t = x ^ (x << 11);
		x = y; y = z; z = w;
		// >>>0 means 'cast to uint32'
		w = ((w ^ (w >>> 19)) ^ (t ^ (t >>> 8)))>>>0;
		return w / 0x100000000;
	};
	Math.random.seed = me;
	return me;
})(0);

var table = null; // 初期化
var furnitures = [];
var max_furniture_num = new Map();
var max_floor_num = new Map();
var max_wall_num = new Map();
let wall = new Set();
let floor = new Set();
let front_top = new Set();
let front_bot = new Set();
let other = new Set();
let frame = new Set();
let selected_wall = new Set();
let selected_floor = new Set();
let selected_front_top = new Set();
let selected_front_bot = new Set();
let selected_other = new Set();

let selected_wall_list = [];
let selected_floor_list = [];
let selected_front_top_list = [];
let selected_front_bot_list = [];
let selected_other_list = [];

var seed = Math.floor(Math.random() * 100000);

let chara_data = {}; // キャラクターデータ
let characterNames = []; // 名前と英語名のリスト

// CSVファイルを読み込んでキャラクターデータを生成し、チェックボックスを生成する
function loadAndGenerateCharacterList() {
    // データを初期化
    chara_data = {};
    characterNames = [];

    // 非同期でCSVデータを読み込む
    return $.ajax({
        url: 'characters.csv',
        dataType: 'text',
        success: function(data) {
            // キャラクターデータとチェックボックスを生成
            const lines = data.split("\n").map(line => line.trim().replace("\r", ""));
            let charaListDiv = $('#charaList');
            charaListDiv.empty();  // 初期化

            lines.forEach(line => {
                const values = line.split(",");
                if (values.length >= 5) {
                    const name = values[0].trim();
                    const englishName = values[1].trim();
                    const dormitory = values[2].trim();
                    const theme1 = values[3].trim();
                    const theme2 = values[4].trim();

                    // キャラクター情報を保存
                    chara_data[englishName] = [dormitory, theme1, theme2];
                    characterNames.push({ name: name, english: englishName });

                    // チェックボックスHTMLを生成
                    const checkboxHtml = `
                        <label>
                            <input type="checkbox" value="${englishName}" onchange="updateSelectedCharacters()">
                            ${name}
                        </label>`;
                    charaListDiv.append(checkboxHtml);
                }
            });
        },
        error: function(error) {
            console.error("キャラクターデータの読み込みに失敗しました:", error);
        }
    });
}

const theme_judge = {
	"normal":1
	,"good":91
	,"great":271
	,"excellent":541
}
const dom_judge = {
	"normal":1
	,"good":101
	,"great":301
	,"excellent":401
}

$(document).ready(function() {
	loadAndGenerateCharacterList(); // ページの読み込み時にキャラクタリストを生成

	const copyButton_stats = document.getElementById("copyButton_stats");
	copyButton_stats.addEventListener("click", () => {
        const textToCopy = $("#text-stats").val();
        navigator.clipboard.writeText(textToCopy).then(() => {
          const balloon = document.createElement("div");
          balloon.className = "balloon";
          balloon.textContent = "明細をコピーしました";
          copyButton_stats.parentNode.appendChild(balloon);

          const buttonRect = copyButton_stats.getBoundingClientRect();
          const balloonRect = balloon.getBoundingClientRect();
          const balloonTop =
            buttonRect.top +
            buttonRect.height / 2 -
            balloonRect.height / 2;
          const balloonLeft = buttonRect.right + 8;

          balloon.style.top = `${balloonTop}px`;
          balloon.style.left = `${balloonLeft}px`;

          setTimeout(() => {
            balloon.parentNode.removeChild(balloon);
          }, 1000);
        });
      });
	$("#btn-stats-out").click(function(){
		resetFilter();
		// チェックボックスの状態を取得
		const checkboxes = document.querySelectorAll('input[type="number"]');
		var lines = [];
		lines.push(seed);
		lines.push(Date.now());
		lines.push(document.getElementById('rankInput').value);
		lines.push(document.querySelector('input[name="proctype"]:checked').value);
		lines.push(document.getElementById("trynum").value);
		// チェックボックスの状態を取得
		const selectedCharacters = Array.from(document.querySelectorAll('#charaList input[type="checkbox"]:checked'))
			.map(checkbox => checkbox.value);
		lines.push(selectedCharacters.join(",")); // 選択されたキャラクターをCSV形式で保存


		lines.push(document.getElementById('dom_grade').value);
		lines.push(document.getElementById('theme_grade').value);
		
		var stats_all = '';
		$.each(checkboxes, function(index, checkbox){ // 各チェックボックスに対して処理を行う
			stats_all += String(checkbox.value).padStart(2, '0');
		});
		lines.push(stats_all);
		$("#text-stats").val(lines.join("\n")); // テキストエリアに設定内容を出力する
	});	
	$("#btn-stats-save").click(function(){
		resetFilter();
		var lines = $("#text-stats").val().split("\n"); // テキストエリアの値を1行ずつ取得
		$("#rankInput").val(lines[2]);
		var radios = document.getElementsByName("proctype");
		if (lines[3] == '0'){radios[0].checked = true;}
		if (lines[3] == '1'){radios[1].checked = true;}
		if (lines[3] == '2'){radios[2].checked = true;}
		$("#trynum").val(lines[4]);
		// チェックボックスの状態を復元
		const selectedCharacters = lines[5].split(",");
		document.querySelectorAll('#charaList input[type="checkbox"]').forEach(checkbox => {
			checkbox.checked = selectedCharacters.includes(checkbox.value);
		});
		updateSelectedCharacters(); // 選択状態を表示に反映

		$("#dom_grade").val(lines[6]);
		$("#theme_grade").val(lines[7]);
		var checkboxes = $('input[type="number"]'); // 全てのチェックボックスを取得
		$.each(checkboxes, function(index, checkbox){ // 各チェックボックスに対して処理を行う
			$(checkbox).val(parseInt(lines[8].substring(2*index,2*index+2)));
		});
		const balloon = document.createElement("div");
		balloon.className = "balloon";
		balloon.textContent = "復元しました";
		document.getElementById("btn-stats-save").parentNode.appendChild(balloon);

		const buttonRect = document.getElementById("btn-stats-save").getBoundingClientRect();
		const balloonRect = balloon.getBoundingClientRect();
		const balloonTop =
		  buttonRect.top +
		  buttonRect.height / 2 -
		  balloonRect.height / 2;
		const balloonLeft = buttonRect.right + 8;

		balloon.style.top = `${balloonTop}px`;
		balloon.style.left = `${balloonLeft}px`;

		setTimeout(() => {
		  balloon.parentNode.removeChild(balloon);
		}, 1000);
	});	
	$.ajax({
		type: "GET",
		url: "roomrank.csv",
		dataType: "text",
		success: function (data) {
			const lines = data.split("\r\n");
			let max_room_rank = 0; // 最大のroom_rankの初期値を0に設定
			for (let i = 0; i < lines.length; i++) {
				if (lines[i]) {
					const row_data = lines[i].split(",");
					const room_rank = parseInt(row_data[0]);
					if (room_rank > max_room_rank) { // 最大のroom_rankを更新
						max_room_rank = room_rank;
					}
					max_furniture_num.set(room_rank,parseInt(row_data[1]))
					max_floor_num.set(room_rank,parseInt(row_data[3]))
					max_wall_num.set(room_rank,parseInt(row_data[5]))
				}
			}
			const numberInput = document.querySelector('#rankInput');
			numberInput.value = max_room_rank;
		}
	});
	$.ajax({
        type: "GET",
        url: "data.csv",
        dataType: "text",
        success: function(data) {
            var lines = data.split("\r\n");
            table = $('#myTable').DataTable({
                "order": [],
                "paging": false,
                "searching": true,
                "info": true,
                "autoWidth": false,
				"columnDefs": [
					{ "targets": [0,12,13,14], "className": "hidden" },
					{ "orderable": false, "targets": [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14] }
				]				
            });
			
			$('#myTable thead th input[type="text"]').on('click', function(e) {
				e.stopPropagation(); // デフォルトのソート切り替えを停止
			});
            for (var i = 0; i < lines.length; i++) {
                if (i !== lines.length - 1 || lines[i]) { // 最終行でない場合か、最終行でも空でない場合
                    var row_data = lines[i].split(",");
					furnitures.push(row_data)
					var add_data = [];
					add_data.push(row_data[0]);
					var max_num = "<td><input type='number' class='have_val' id = 'max_num" + row_data[0] + "' name='max_num' value='" + row_data[15] + "'min='0' max='" + row_data[15] + "'></td>";
					add_data.push(max_num);
					add_data.push(row_data[1]);
					add_data.push(row_data[2]);
					add_data.push(row_data[3]);
					add_data.push(row_data[11]);
					add_data.push(row_data[9]);
					add_data.push(row_data[12]);
					add_data.push(row_data[10]);
					add_data.push(row_data[13]);
					add_data.push(row_data[8]);
					add_data.push(row_data[14]);
					add_data.push(row_data[4]);
					add_data.push(row_data[5]);
					add_data.push(row_data[6]);

                    table.row.add(add_data);

                }
            }
            
            // 手入力家具をメインテーブルに統合（furnitures配列も同時に更新）
            integrateCustomFurnitureWithMainTable();
            
            // カテゴリ別セットを再作成
            updateCategorySets();
			

            table.draw();
			restoreInputState();
        }
    });
	const tabs = document.querySelectorAll(".tab");
	const tabContents = document.querySelectorAll(".tabContent");
	$.fn.dataTable.ext.search.push(
		function(settings, data, dataIndex) {
			var filterValue = $('#filter-col2').val(); // フィルタのテキストフィールドの値
			var columnValue = $('#max_num' + dataIndex).val(); // max_numXの値を取得
	
			// フィルタが空なら全て表示、値が含まれていればその行を表示
			if (filterValue === '' || columnValue==filterValue) {
				return true;
			}
			return false;
		}
	);
	
	// フィルタが変更されたときにテーブルを再描画
	$('#filter-col1').on('keyup change', function() {
        table.column(0).search(this.value).draw();
	});
	$('#filter-col2').on('keyup change', function() {
		table.draw();
    });
	$('#filter-col3').on('keyup change', function() {
        table.column(2).search(this.value).draw();
    });
	$('#filter-col4').on('keyup change', function() {
		var searchTerm = this.value;
		if (searchTerm) {
			// Add `^` and `$` to enforce exact match
			table.column(3).search('^' + searchTerm + '$', true, false).draw();
		} else {
			// If the search term is empty, clear the filter
			table.column(3).search('').draw();
		}
	});
    $('#filter-col5').on('keyup change', function() {
        table.column(4).search(this.value).draw();
    });
    $('#filter-col6').on('keyup change', function() {
        table.column(5).search(this.value).draw();
    });
    $('#filter-col7').on('keyup change', function() {
        table.column(6).search(this.value).draw();
    });
    $('#filter-col8').on('keyup change', function() {
        table.column(7).search(this.value).draw();
    });
    $('#filter-col9').on('keyup change', function() {
        table.column(8).search(this.value).draw();
    });
    $('#filter-col10').on('keyup change', function() {
        table.column(9).search(this.value).draw();
    });
    $('#filter-col11').on('keyup change', function() {
        table.column(10).search(this.value).draw();
    });
    $('#filter-col12').on('keyup change', function() {
        table.column(11).search(this.value).draw();
    });
    $('#filter-col13').on('keyup change', function() {
        table.column(12).search(this.value).draw();
    });
    $('#filter-col14').on('keyup change', function() {
        table.column(13).search(this.value).draw();
    });
    $('#filter-col15').on('keyup change', function() {
        table.column(14).search(this.value).draw();
    });
	tabs.forEach((tab) => {
		tab.addEventListener("click", () => {
			const target = tab.getAttribute("data-tab");

			tabs.forEach((tab) => {
			tab.classList.remove("active");
			});

			tabContents.forEach((tabContent) => {
			tabContent.classList.remove("active");
			});

			tab.classList.add("active");
			document.querySelector(`[data-tab="${target}Content"]`).classList.add("active");
		});
	});
});

// キャラクター選択を更新
let selectedCharas = [];
function updateSelectedCharacters() {
    selectedCharas = Array.from(document.querySelectorAll('#charaList input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.closest('label').textContent.trim());

    const selectedCharaDisplay = document.getElementById('selectedCharDisplay');
    selectedCharaDisplay.innerHTML = selectedCharas.length > 0
        ? "選択中: " + selectedCharas.join(", ")
        : "選択中: なし";
}

// 選択解除ボタン
function clearSelections() {
    document.querySelectorAll('#charaList input[type="checkbox"]').forEach(checkbox => checkbox.checked = false);
    updateSelectedCharacters();  // 選択状態を更新
}


// モーダル操作
function openModal() {
    document.getElementById("charaModal").style.display = "block";
}

function closeModal() {
    document.getElementById("charaModal").style.display = "none";
}

window.onclick = function(event) {
    const modal = document.getElementById("charaModal");
    if (event.target == modal) {
        closeModal();
    }
}

function chooseRandomElements(arr, num) {
	const result = [];
	const copyArr = Array.from(arr);
	for (let i = 0; i < num && copyArr.length > 0; i++) {
	  const randomIndex = Math.floor(Math.random() * copyArr.length);
	  const element = copyArr.splice(randomIndex, 1)[0];
	  result.push(element);
	}
	return result;
  }
function dummyTask() {
return new Promise(resolve => {
	setTimeout(() => {
		const result = dummyfunction();
		resolve(result);
	}, 10);
	});
}
function dummyfunction() {
	return 0;
}
let dom_names = [];
let  theme_1s = [];
let  theme_2s = [];
let selectedCharacters = [];
async function calcstart(){
	resetFilter();
	dom_names = [];
	theme_1s = [];
	theme_2s = [];
	const messageSpan = document.getElementById("processing");
	let trynum = parseInt(document.getElementById("trynum").value);
	seed = parseInt(document.getElementById("seed").value);
	if (seed == -1){seed = Math.floor(Math.random() * 100000);}
	Math.random.seed(seed);

	// チェックボックスから選択されたキャラクターの値を取得
	selectedCharacters = [];
	const checkboxes = document.querySelectorAll('#charaList input[type="checkbox"]:checked');
	checkboxes.forEach(function(checkbox) {
		selectedCharacters.push(checkbox.value);
	});

	// dom_name, theme_1, theme_2 を選択されたすべてのキャラに対して計算
	selectedCharacters.forEach(character => {
		dom_names.push(chara_data[character][0]);
		theme_1s.push(chara_data[character][1]);
		theme_2s.push(chara_data[character][2]);
	});

	messageSpan.innerHTML = "0/"+trynum+" 処理中...";
	await dummyTask();
	let maxComfort = -Infinity;
	let maxResult;
	for (let i = 0; i < trynum; i++) {
	  const ret = await longTask();
	  messageSpan.innerHTML = (i+1) + "/"+trynum+" 処理中...";
	  if (ret[0] > maxComfort) {
		maxComfort = ret[0];
		maxResult = ret;
	  }
	}
	var ret = maxResult;
	if (ret[0] < 0){var comfort = '部屋の条件を満たせませんでした。条件を緩くしてください。';}
	else {var comfort = '達成率:'+Math.min((100*ret[0]),100).toFixed(2) + '％';}

	var output='<div><button id="copyButton">\
	<i class="fas fa-clipboard">コピー</i>\
	<div id="balloonContainer"/></button></div>\
	<div id="details1" class="details textarea-wrapper">';
	output+='<div style="display: flex;">';
	let copy_txt = '';
	const dormOrder = [
		'ハーツラビュル', 'サバナクロー', 'オクタヴィネル', 'スカラビア',
		'ポムフィオーレ', 'イグニハイド', 'ディアソムニア', 'ナイトレイブンカレッジ', 'なし'
	];
	const typeOrder = [
		'家具：机', '家具：椅子', '家具：収納', '家具：その他',
		'装飾：パーティション', '装飾：壁装飾', '装飾：写真', '装飾：ラグ',
		'雑貨：小型雑貨', '雑貨：小物雑貨', '雑貨：大型雑貨', '雑貨：衣装',
		'内観・外観：床', '内観・外観：壁紙', '内観・外観：前景'
	];
	
	const dormOrderMap = Object.fromEntries(dormOrder.map((dorm, index) => [dorm, index]));
	const typeOrderMap = Object.fromEntries(typeOrder.map((type, index) => [type, index]));
	let ret1 = [];
	for (let cur of ret[1]) {
		ret1.push(cur);
	}
	let countMap = {};
	for (let item of ret1) {
		countMap[item] = (countMap[item] || 0) + 1;
	}

	let sortedKeys = Object.keys(countMap);
	sortedKeys.sort((a, b) => {
		const dormA = furnitures[a][13] ?? 'なし';
		const dormB = furnitures[b][13] ?? 'なし';
		const typeA = furnitures[a][3];
		const typeB = furnitures[b][3];
		
		if (dormOrderMap[dormA] !== dormOrderMap[dormB]) {
			return dormOrderMap[dormA] - dormOrderMap[dormB];
		}
		return typeOrderMap[typeA] - typeOrderMap[typeB];
	});
	
	for (let key of sortedKeys) {
		if (countMap[key] === 1) {
			output += `${furnitures[key][1]}<br>`;
			copy_txt += `${furnitures[key][1]}\r\n`;
		} else {
			output += `${furnitures[key][1]}\t${countMap[key]}<br>`;
			copy_txt += `${furnitures[key][1]}\t${countMap[key]}\r\n`;
		}
	}

	output+='</div>';
	$("#selectedRows").html(output);
	$("#statsDetail").html(makeStatsDetail(ret[1]));
	$("#themeDetail").html(makeThemeDetail(ret[1]));
	$("#themeDetail").append(`
		<p>判定基準値<br>
		テーマExcellent: 541<br>
		テーマGreat: 271<br>
		テーマGood: 91<br><br>
		寮Excellent: 401<br>
		寮Great: 301<br>
		寮Good: 101</p>
	`);
	messageSpan.innerHTML = comfort;

	const copyButton = document.getElementById("copyButton");
	copyButton.addEventListener("click", () => {
        const textToCopy = copy_txt;
        navigator.clipboard.writeText(textToCopy).then(() => {
          const balloon = document.createElement("div");
          balloon.className = "balloon";
          balloon.textContent = "明細をコピーしました";
          copyButton.parentNode.appendChild(balloon);

          const buttonRect = copyButton.getBoundingClientRect();
          const balloonRect = balloon.getBoundingClientRect();
          const balloonTop =
            buttonRect.top +
            buttonRect.height / 2 -
            balloonRect.height / 2;
          const balloonLeft = buttonRect.right + 8;

          balloon.style.top = `${balloonTop}px`;
          balloon.style.left = `${balloonLeft}px`;

          setTimeout(() => {
            balloon.parentNode.removeChild(balloon);
          }, 1000);
        });
      });
}
function makeStatsDetail(furnitureNoList) {

	let html_text = '<div style="display: flex;"><table border="1"><tr><th>キャラ</th><th>寮値</th><th>テーマ値</th><th>テーマ1</th><th>テーマ2</th></tr>';
	const themes = {
		スタイリッシュ: 0,
		ユニーク: 0,
		スタイリッシュ: 0,
		ベーシック: 0,
		エレガント: 0,
		ポップ: 0,
	};
	const doms = {
		ハーツラビュル: 0,
		サバナクロー: 0,
		オクタヴィネル: 0,
		スカラビア: 0,
		ポムフィオーレ: 0,
		イグニハイド: 0,
		ディアソムニア: 0,
		ナイトレイブンカレッジ: 0,
	};

	const dormClassMap = {
		'ハーツラビュル': 'heartslabyul',
		'サバナクロー': 'savanaclaw',
		'オクタヴィネル': 'octavinelle',
		'スカラビア': 'scarabia',
		'ポムフィオーレ': 'pomefiore',
		'イグニハイド': 'ignihydes',
		'ディアソムニア': 'diasomnia',
		'ナイトレイブンカレッジ': 'nightRavenCollege',
	};

	for (let i = 0; i < furnitureNoList.length; i++) {
		let data = furnitures[furnitureNoList[i]];
		themes[data[11]] += (parseFloat(data[9]) || 0);
		themes[data[12]] += (parseFloat(data[10]) || 0);
		doms[data[13]] += parseInt(data[8]) || 0;
	}

	characterNames.forEach(cur => {
		const character = chara_data[cur.english];
		const theme_point = themes[character[1]] + (themes[character[2]] / 2);
		const dom_point = doms[character[0]];
		const dormClass = dormClassMap[character[0]] || '';

		// キャラクターが選ばれているかどうかでCSSクラスを変更
		if (selectedCharas.indexOf(cur.name) == -1) {
			html_text += `<tr>
				<td class="${dormClass}">${cur.name}</td>
				<td>${dom_point}</td>
				<td>${theme_point}</td>
				<td>${character[1]}</td>
				<td>${character[2]}</td>
			</tr>`;
		} else {
			html_text += `<tr>
				<td class="${dormClass}">${cur.name}</td>
				<td class="selectedChara">${dom_point}</td>
				<td class="selectedChara">${theme_point}</td>
				<td class="selectedChara">${character[1]}</td>
				<td class="selectedChara">${character[2]}</td>
			</tr>`;
		}
	});

	html_text += '</table></div>';
	return html_text;
}


function makeThemeDetail(furnitureNoList) {
    let html_text = '<div style="display: flex;"><table border="1"><tr><th>テーマ</th><th>テーマ値</th></tr>';
    const themes = {
        スタイリッシュ: 0,
        ユニーク: 0,
        ベーシック: 0,
        エレガント: 0,
        ポップ: 0,
        '－': 0,
    };

    // テーマ値を集計
    for (let i = 0; i < furnitureNoList.length; i++) {
        let data = furnitures[furnitureNoList[i]];
        themes[data[11]] += (parseFloat(data[9]) || 0);
        themes[data[12]] += (parseFloat(data[10]) || 0);
    }

    // テーマごとに行を追加
    for (const theme in themes) {
        html_text += `<tr><td>${theme}</td><td>${themes[theme]}</td></tr>`;
    }

    html_text += '</table></div>';
    return html_text;
}


function longTask() {
	return new Promise(resolve => {
		setTimeout(() => {
		  const result = displaySelected();
		  resolve(result);
		}, 1);
	  });
}
function displaySelected() {
	const messageSpan = document.getElementById("processing");
	selected_wall = new Set();
	selected_floor = new Set();
	selected_front_top = new Set();
	selected_front_bot = new Set();
	selected_other = new Set();
	selected_wall_list = [];
	selected_floor_list = [];
	selected_front_top_list = [];
	selected_front_bot_list = [];
	selected_other_list = [];

	   
    table.search('').draw(); // search欄の値を空にすることでテーブルを全件表示する
    var selectedRows = $('input').parents('tr');

	var selectedData = []; // 選択された行のデータを格納するリストを初期化する
	var selectedMaxVal = {};
	var tmp_selected_wall = [];
	var tmp_selected_floor = [];
	var tmp_selected_front_top = [];
	var tmp_selected_front_bot = [];
	var tmp_selected_other = [];

    selectedRows.each(function () {
        var rowData = [];
		$(this).find('td').each(function () {
			if ($(this).index() == 1) {
				rowData.push($(this).find('input[type="number"]').val());
			} else {
				rowData.push($(this).text());
			}
		});
		var no = parseInt(rowData[0]);
		if (parseInt(rowData[1]) <= 0){return true};
		var theme_1_name = rowData[5];
		var theme_2_name = rowData[7];
		var domi_name = rowData[9];
		// テーマとドミトリーの一致を確認
		if (theme_1s.includes(theme_1_name) || theme_1s.includes(theme_2_name) ||
			theme_2s.includes(theme_1_name) || theme_2s.includes(theme_2_name) ||
			dom_names.includes(domi_name)) {
			var point = 0;
			if (theme_1s.includes(theme_1_name)){point+=parseInt(rowData[6])}
			if (theme_1s.includes(theme_2_name)){point+=parseInt(rowData[8])}
			if (theme_2s.includes(theme_1_name)){point+=parseInt(rowData[6])/2}
			if (theme_2s.includes(theme_2_name)){point+=parseInt(rowData[8])/2}
			if (dom_names.includes(domi_name)){point+=parseInt(rowData[10])}
			selectedData.push(no); // リストに行のデータを追加する
			selectedMaxVal[no] = parseInt(rowData[1]);
			if (wall.has(no)){tmp_selected_wall.push([point,no])}
			if (floor.has(no)){tmp_selected_floor.push([point,no])}
			if (front_top.has(no)){tmp_selected_front_top.push([point,no])}
			if (front_bot.has(no)){tmp_selected_front_bot.push([point,no])}
			if (other.has(no)){tmp_selected_other.push([point,no])}
		}
    });
	function sortByNumber(listOfLists) {
		listOfLists.sort((a, b) => b[0] - a[0]);
		}
	sortByNumber(tmp_selected_wall);
	sortByNumber(tmp_selected_floor);
	sortByNumber(tmp_selected_front_top);
	sortByNumber(tmp_selected_front_bot);
	sortByNumber(tmp_selected_other);
	for (let i = 0; i < tmp_selected_wall.length; i++) {
		selected_wall_list.push(tmp_selected_wall[i][1]);
		selected_wall.add(tmp_selected_wall[i][1]);
	}
	for (let i = 0; i < tmp_selected_floor.length; i++) {
		selected_floor_list.push(tmp_selected_floor[i][1]);
		selected_floor.add(tmp_selected_floor[i][1]);
	}
	for (let i = 0; i < tmp_selected_front_top.length; i++) {
		selected_front_top_list.push(tmp_selected_front_top[i][1]);
		selected_front_top.add(tmp_selected_front_top[i][1]);
	}
	for (let i = 0; i < tmp_selected_front_bot.length; i++) {
		selected_front_bot_list.push(tmp_selected_front_bot[i][1]);
		selected_front_bot.add(tmp_selected_front_bot[i][1]);
	}
	for (let i = 0; i < tmp_selected_other.length; i++) {
		selected_other_list.push(tmp_selected_other[i][1]);
		selected_other.add(tmp_selected_other[i][1]);
	}
	var room_rank = parseInt(document.getElementById('rankInput').value);
	let ret = simulatedAnnealing(selectedData, selectedMaxVal, room_rank);
	return ret;
}
function cost(data_list, selected_maxval, room_rank) {
    let base_point = 1;
    let place_area = 0;
    let floor_area = 0;
    let wall_area = 0;
    const countMap = new Map();
    // 各キャラクターごとのdormitory_val, themes_valを格納するためのオブジェクト
    let dormitory_vals = {};
    let themes_vals = {};

    // 初期化
    selectedCharacters.forEach(character => dormitory_vals[character] = 0);
    selectedCharacters.forEach(character => themes_vals[character] = 0);

    for (let i = 0; i < data_list.length; i++) {
        let num = data_list[i];
        countMap.set(num, (countMap.get(num) || 0) + 1);
        let data = furnitures[num];
        place_area += parseInt(data[4]) ? parseInt(data[4]) : 0;
        floor_area += parseInt(data[5]) ? parseInt(data[5]) : 0;
        wall_area += parseInt(data[6]) ? parseInt(data[6]) : 0;

        // テーマとドミトリーのスコアを計算
        selectedCharacters.forEach(character => {
            let theme_1 = chara_data[character][1];
            let theme_2 = chara_data[character][2];
            let dom_name = chara_data[character][0];

            // テーマのスコアを計算
            if (theme_1 === data[11]) themes_vals[character] += parseFloat(data[9]) || 0;
            if (theme_1 === data[12]) themes_vals[character] += parseFloat(data[10]) || 0;
            if (theme_2 === data[11]) themes_vals[character] += (parseFloat(data[9]) || 0) / 2;
            if (theme_2 === data[12]) themes_vals[character] += (parseFloat(data[10]) || 0) / 2;

            // ドミトリーのスコアを計算
            if (dom_name === data[13]) dormitory_vals[character] += parseInt(data[8]) || 0;
        });
    }

    // 罰則を計算
    if (wall_area > max_wall_num.get(room_rank)) { base_point *= 0.25 ** (wall_area - max_wall_num.get(room_rank)); }
    if (floor_area > max_floor_num.get(room_rank)) { base_point *= 0.25 ** (floor_area - max_floor_num.get(room_rank)); }
    if (place_area > max_floor_num.get(room_rank)) { base_point *= 0.25 ** (place_area - max_floor_num.get(room_rank)); }
    if (data_list.filter(element => frame.has(element)).length > 1) { base_point *= 0.25; }
    for (const key of countMap.keys()) {
        if (countMap.get(key) > selected_maxval[key]) {
            base_point *= 0.25 ** (countMap.get(key) - selected_maxval[key]);
        }
    }

    // ドミトリーの評価ラインとスコアを計算
    let final_dom_score = 1;

    // テーマの評価ラインとスコアをキャラごとに計算
    let final_theme_score = 1;
	let total_theme_rate = 1;
    selectedCharacters.forEach(character => {
        let dom_select = document.getElementById("dom_grade");
        let dom_line = dom_judge[dom_select.options[dom_select.selectedIndex].value];
        final_dom_score *= Math.min(dormitory_vals[character] / dom_line, 1);
        let theme_select = document.getElementById("theme_grade");
        let theme_line = theme_judge[theme_select.options[theme_select.selectedIndex].value];
        let score = Math.min(themes_vals[character] / theme_line, 1);
		total_theme_rate *= themes_vals[character] / theme_line;
        final_theme_score *= score;
    });
	// console.log(base_point, final_dom_score, final_theme_score)
	if (base_point * final_dom_score * final_theme_score >= 1) {
		return base_point * final_dom_score * total_theme_rate;
	}
    return base_point * final_dom_score * final_theme_score;
}


  // 焼きなまし法
function simulatedAnnealing(selected_data,selected_maxval,room_rank) {

	const selectedproctype = document.querySelector('input[name="proctype"]:checked');
	const proc_dict = {
		0: 0.999,
		1: 0.9997,
		2: 0.9999,
		3: 0.999999
	  };
    let coolingRate = 0;
	if (selectedproctype) {
		coolingRate = parseInt(selectedproctype.value);
	} else {
		coolingRate = 1;
	}

	const initialTemperature = 1000; // 初期温度
	const finalTemperature = 0.01; // 終了温度
	coolingRate = proc_dict[coolingRate]; // 冷却率
	let currentSolution = initializeSolution(room_rank, selected_maxval); // 解の初期化

	let currentCost = cost(currentSolution,selected_maxval,room_rank);
	let bestSolution = currentSolution.slice(); // 最適解
	let bestCost = currentCost;

	let temperature = initialTemperature;

	while (temperature > finalTemperature) {
		// 新しい解を生成
		let newSolution = generateNewSolution(currentSolution);

		// 新しい解のコストを計算
		let newCost = cost(newSolution,selected_maxval,room_rank);
		if (newCost < currentCost/2){
			// 温度を下げる
			temperature *= coolingRate;
			continue;
		}
		// 受理確率を計算
		let acceptanceProbability = calculateAcceptanceProbability(
			currentCost,
			newCost,
			temperature
		);
		// 受理する場合は新しい解を採用
		if (acceptanceProbability > Math.random()) {
			currentSolution = newSolution.slice();
			currentCost = newCost;
		}

		// 最適解を更新
		if (currentCost > bestCost) {
			bestSolution = currentSolution.slice();
			bestCost = currentCost;
		}

		// 温度を下げる
		temperature *= coolingRate;
	}

	return [bestCost,bestSolution];
}

// 初期解の生成
function initializeSolution(room_rank, selected_maxval) {
	var max_furniture = max_furniture_num.get(room_rank)
	var ret = chooseRandomElements(selected_floor_list,room_rank >= 31 ? 2 : 1).concat(
		chooseRandomElements(selected_wall_list,room_rank >= 31 ? 2 : 1)
		,chooseRandomElements(selected_front_top_list,room_rank >= 31 ? 4 : 2)
		,chooseRandomElements(selected_front_bot_list,room_rank >= 31 ? 4 : 2));
	var remain_furniture_num = max_furniture - ret.length;
	for (let i = 0; i < selected_other_list.length; i++) {
		const furniture_no = selected_other_list[i];
		for (let j = 0; j < selected_maxval[furniture_no]; j++){
			if (remain_furniture_num > 0) {
				ret.push(furniture_no)
				remain_furniture_num--;	
			}
		}
	}
	return ret;
}

// 新しい解の生成
function generateNewSolution(currentSolution) {
	let next_solution = Array.from(currentSolution);
	let randomIndex = Math.floor(Math.random() * next_solution.length); // ランダムなインデックスを取得
	let randomItem = next_solution.splice(randomIndex, 1)[0]; // リストからランダムな要素を取得し、リストから削除
	let add_index = -1;
	let add_item = -1;
	let arr1 = [];
	let arr2 = next_solution;
	if(selected_wall.has(randomItem)){
		arr1 = selected_wall_list;
	}else if (selected_floor.has(randomItem)){
		arr1 = selected_floor_list;
	}else if (selected_front_top.has(randomItem)){
		arr1 = selected_front_top_list;
	}else if (selected_front_bot.has(randomItem)){
		arr1 = selected_front_bot_list;
	}else if (selected_other.has(randomItem)){
		arr1 = selected_other_list;
	}
	const diffArray = arr1;
	if (diffArray.length == 0){return next_solution}
	add_index = Math.floor(Math.random()**1.6 * diffArray.length); // ランダムなインデックスを取得
	add_item = diffArray[add_index]; // ランダムに選択された要素を取得
	next_solution.push(add_item);
	return next_solution;
}

// 受理確率の計算
function calculateAcceptanceProbability(currentCost, newCost, temperature) {
	if (newCost >= currentCost) {
		return 1;
	}
	const delta = currentCost - newCost;
	// console.log(delta*temperature/1000);
	return delta*temperature/1000;
}

// 面積自動計算機能
function calculateAreas(category, squares) {
    let installArea = 0;
    let floorArea = 0;
    let wallArea = 0;
    
    const squareNum = parseInt(squares) || 0;
    
    if (category === "装飾：写真" || category === "装飾：壁装飾") {
        // 壁面積 = マス数、設置面積 = 0、床面積 = 0
        wallArea = squareNum;
        installArea = 0;
        floorArea = 0;
    } else if (category === "装飾：ラグ") {
        // 床面積 = マス数、設置面積 = 0、壁面積 = 0
        floorArea = squareNum;
        installArea = 0;
        wallArea = 0;
    } else {
        // その他すべて → 設置面積 = マス数、床面積 = 0、壁面積 = 0
        installArea = squareNum;
        floorArea = 0;
        wallArea = 0;
    }
    
    return {
        installArea: installArea,
        floorArea: floorArea,
        wallArea: wallArea
    };
}

// 分類に基づいて面積を計算する関数
function calculateAreas(category, squares) {
    const squaresNum = parseInt(squares) || 0;
    let installArea = 0;
    let floorArea = 0;
    let wallArea = 0;

    // design.mdの面積自動計算ロジックに従って実装
    if (category === '装飾：写真' || category === '装飾：壁装飾') {
        // 装飾：写真、装飾：壁装飾 → 壁面積 = マス数、設置面積 = 0、床面積 = 0
        wallArea = squaresNum;
        installArea = 0;
        floorArea = 0;
    } else if (category === '装飾：ラグ') {
        // 装飾：ラグ → 床面積 = マス数、設置面積 = 0、壁面積 = 0
        floorArea = squaresNum;
        installArea = 0;
        wallArea = 0;
    } else {
        // その他すべて → 設置面積 = マス数、床面積 = 0、壁面積 = 0
        installArea = squaresNum;
        floorArea = 0;
        wallArea = 0;
    }

    return {
        install: installArea,
        floor: floorArea,
        wall: wallArea
    };
}

// 分類変更時の面積計算
function onCategoryChange() {
    const category = document.getElementById('furnitureCategory').value;
    const squares = document.getElementById('squares').value;
    
    if (category && squares) {
        const areas = calculateAreas(category, squares);
        // 面積フィールドが存在する場合は更新（後のタスクで実装予定）
        console.log('計算された面積:', areas);
    }
}

// マス数変更時の面積再計算
function onSquaresChange() {
    const category = document.getElementById('furnitureCategory').value;
    const squares = document.getElementById('squares').value;
    
    if (category && squares) {
        const areas = calculateAreas(category, squares);
        // 面積フィールドが存在する場合は更新（後のタスクで実装予定）
        console.log('計算された面積:', areas);
    }
}

// ローカルストレージに手入力家具データを保存する機能
function saveCustomFurnitureToLocalStorage(furnitureData) {
    try {
        let customFurniture = JSON.parse(localStorage.getItem('customFurniture') || '[]');
        
        // 新規追加の場合はIDを生成
        if (!furnitureData.id) {
            furnitureData.id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
        }
        
        // 既存データの更新か新規追加かを判定
        const existingIndex = customFurniture.findIndex(item => item.id === furnitureData.id);
        
        if (existingIndex >= 0) {
            // 既存データを更新
            customFurniture[existingIndex] = furnitureData;
        } else {
            // 新規データを追加
            customFurniture.push(furnitureData);
        }
        
        localStorage.setItem('customFurniture', JSON.stringify(customFurniture));
        return true;
    } catch (error) {
        console.error('ローカルストレージへの保存に失敗しました:', error);
        return false;
    }
}

// ローカルストレージから手入力家具データを読み込む機能
function loadCustomFurnitureFromLocalStorage() {
    try {
        const customFurniture = JSON.parse(localStorage.getItem('customFurniture') || '[]');
        return customFurniture;
    } catch (error) {
        console.error('ローカルストレージからの読み込みに失敗しました:', error);
        return [];
    }
}

// 手入力家具データを削除する機能
function deleteCustomFurnitureFromLocalStorage(furnitureId) {
    try {
        let customFurniture = JSON.parse(localStorage.getItem('customFurniture') || '[]');
        customFurniture = customFurniture.filter(item => item.id !== furnitureId);
        localStorage.setItem('customFurniture', JSON.stringify(customFurniture));
        return true;
    } catch (error) {
        console.error('ローカルストレージからの削除に失敗しました:', error);
        return false;
    }
}

// バリデーション機能
function validateCustomFurniture(formData, editingId = null) {
    const errors = [];
    
    // 必須フィールドチェック
    if (!formData.name || formData.name.trim() === '') {
        errors.push('名称は必須です。');
    }
    
    if (!formData.category || formData.category === '') {
        errors.push('分類は必須です。');
    }
    
    // 数値範囲チェック
    if (formData.theme1Value < 0 || formData.theme1Value > 50) {
        errors.push('テーマ１値は0-50の範囲で入力してください。');
    }
    
    if (formData.theme2Value < 0 || formData.theme2Value > 50) {
        errors.push('テーマ２値は0-50の範囲で入力してください。');
    }
    
    if (formData.dormValue < 0 || formData.dormValue > 50) {
        errors.push('寮値は0-50の範囲で入力してください。');
    }
    
    if (formData.squares < 0) {
        errors.push('マス数は0以上で入力してください。');
    }
    
    // 重複チェック
    const existingFurniture = loadCustomFurnitureFromLocalStorage();
    const duplicateName = existingFurniture.find(item => 
        item.name === formData.name && item.id !== editingId
    );
    
    if (duplicateName) {
        errors.push('同じ名称の家具が既に登録されています。');
    }
    
    return errors;
}

// エラーメッセージ表示機能
function displayValidationErrors(errors) {
    const errorContainer = document.getElementById('validationErrors');
    if (!errorContainer) {
        // エラーメッセージ表示用のコンテナを作成
        const container = document.createElement('div');
        container.id = 'validationErrors';
        container.className = 'validation-errors';
        const form = document.getElementById('customFurnitureForm');
        form.appendChild(container);
    }
    
    const errorElement = document.getElementById('validationErrors');
    
    if (errors.length > 0) {
        errorElement.innerHTML = '<ul>' + errors.map(error => `<li>${error}</li>`).join('') + '</ul>';
        errorElement.style.display = 'block';
    } else {
        errorElement.style.display = 'none';
    }
}

// フィールドのハイライト表示機能
function highlightErrorFields(formData) {
    // 全フィールドのハイライトをクリア
    const fields = ['furnitureName', 'furnitureCategory', 'theme1Value', 'theme2Value', 'dormValue', 'squares'];
    fields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            element.classList.remove('error-field');
        }
    });
    
    // エラーのあるフィールドをハイライト
    if (!formData.name || formData.name.trim() === '') {
        document.getElementById('furnitureName')?.classList.add('error-field');
    }
    
    if (!formData.category || formData.category === '') {
        document.getElementById('furnitureCategory')?.classList.add('error-field');
    }
    
    if (formData.theme1Value < 0 || formData.theme1Value > 50) {
        document.getElementById('theme1Value')?.classList.add('error-field');
    }
    
    if (formData.theme2Value < 0 || formData.theme2Value > 50) {
        document.getElementById('theme2Value')?.classList.add('error-field');
    }
    
    if (formData.dormValue < 0 || formData.dormValue > 50) {
        document.getElementById('dormValue')?.classList.add('error-field');
    }
    
    if (formData.squares < 0) {
        document.getElementById('squares')?.classList.add('error-field');
    }
}

// 手入力家具一覧テーブルを更新する機能
function updateCustomFurnitureTable() {
    const customFurniture = loadCustomFurnitureFromLocalStorage();
    const tableBody = document.getElementById('customFurnitureTableBody');
    
    if (!tableBody) {
        console.error('テーブルのbody要素が見つかりません');
        return;
    }
    
    // テーブルをクリア
    tableBody.innerHTML = '';
    
    if (customFurniture.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="13" style="text-align: center;">登録された家具がありません</td>';
        tableBody.appendChild(emptyRow);
        return;
    }
    
    // 各家具データをテーブル行として追加
    customFurniture.forEach(furniture => {
        const row = document.createElement('tr');
        
        const areas = calculateAreas(furniture.category, furniture.squares);
        
        row.innerHTML = `
            <td>${furniture.name}</td>
            <td>${furniture.category}</td>
            <td>${furniture.theme1 || '－'}</td>
            <td>${furniture.theme1Value || 0}</td>
            <td>${furniture.theme2 || '－'}</td>
            <td>${furniture.theme2Value || 0}</td>
            <td>${furniture.dorm || 'なし'}</td>
            <td>${furniture.dormValue || 0}</td>
            <td>${furniture.squares}</td>
            <td>${areas.install}</td>
            <td>${areas.floor}</td>
            <td>${areas.wall}</td>
            <td>
                <button onclick="deleteCustomFurniture('${furniture.id}')" class="delete-button">削除</button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// ページ読み込み時に手入力家具一覧を更新
function initializeCustomFurnitureTable() {
    updateCustomFurnitureTable();
    // メインテーブルが存在する場合、手入力家具を統合
    if (table) {
        integrateCustomFurnitureWithMainTable();
    }
}

// フォームリセット機能
function resetCustomForm() {
    const form = document.getElementById('customFurnitureForm');
    if (form) {
        form.reset();
        
        // 編集モードを解除
        window.editingFurnitureId = null;
        
        // 保存ボタンのテキストを元に戻す
        const saveButton = form.querySelector('.save-button');
        if (saveButton) {
            saveButton.textContent = '保存';
        }
        
        // エラーメッセージとハイライトをクリア
        displayValidationErrors([]);
        const fields = ['furnitureName', 'furnitureCategory', 'theme1Value', 'theme2Value', 'dormValue', 'squares'];
        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                element.classList.remove('error-field');
            }
        });
    }
}

// 編集機能
function editCustomFurniture(furnitureId) {
    const customFurniture = loadCustomFurnitureFromLocalStorage();
    const furniture = customFurniture.find(item => item.id === furnitureId);
    
    if (!furniture) {
        alert('該当する家具が見つかりません。');
        return;
    }
    
    // フォームに既存データを読み込む
    document.getElementById('furnitureName').value = furniture.name || '';
    document.getElementById('furnitureCategory').value = furniture.category || '';
    document.getElementById('theme1').value = furniture.theme1 || '';
    document.getElementById('theme1Value').value = furniture.theme1Value || 0;
    document.getElementById('theme2').value = furniture.theme2 || '';
    document.getElementById('theme2Value').value = furniture.theme2Value || 0;
    document.getElementById('dorm').value = furniture.dorm || '';
    document.getElementById('dormValue').value = furniture.dormValue || 0;
    document.getElementById('squares').value = furniture.squares || 0;
    
    // 編集モードフラグを設定
    window.editingFurnitureId = furnitureId;
    
    // 保存ボタンのテキストを変更
    const saveButton = document.querySelector('.save-button');
    if (saveButton) {
        saveButton.textContent = '更新';
    }
    
    // エラーメッセージをクリア
    displayValidationErrors([]);
}

// 選択済みキャラを除外して残りキャラのリストを取得
function getRemainingCharacters() {
    const selectedCharacters = Array.from(document.querySelectorAll('#charaList input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value);
    
    return characterNames.filter(char => !selectedCharacters.includes(char.english));
}

// 指定されたキャラクターで計算処理（共通関数）
async function calculateWithCharacters(characterList) {
    const tempSelectedCharacters = characterList;
    
    // 一時的にdom_names, theme_1s, theme_2sを更新
    const tempDomNames = [];
    const tempTheme1s = [];
    const tempTheme2s = [];
    
    tempSelectedCharacters.forEach(character => {
        tempDomNames.push(chara_data[character][0]);
        tempTheme1s.push(chara_data[character][1]);
        tempTheme2s.push(chara_data[character][2]);
    });
    
    // グローバル変数を一時的に保存
    const originalDomNames = [...dom_names];
    const originalTheme1s = [...theme_1s];
    const originalTheme2s = [...theme_2s];
    const originalSelectedCharacters = [...selectedCharacters];
    
    // 一時的にグローバル変数を更新
    dom_names = tempDomNames;
    theme_1s = tempTheme1s;
    theme_2s = tempTheme2s;
    selectedCharacters = tempSelectedCharacters;
    
    try {
        let trynum = parseInt(document.getElementById("trynum").value);
        let maxComfort = -Infinity;
        let maxResult;
        
        for (let i = 0; i < trynum; i++) {
            const ret = await longTask();
            if (ret[0] > maxComfort) {
                maxComfort = ret[0];
                maxResult = ret;
            }
        }
        
        return maxResult;
    } finally {
        // グローバル変数を元に戻す
        dom_names = originalDomNames;
        theme_1s = originalTheme1s;
        theme_2s = originalTheme2s;
        selectedCharacters = originalSelectedCharacters;
    }
}

// 各キャラクターでの計算処理
async function calculateWithAdditionalCharacter(additionalCharacter) {
    // 現在の選択キャラに追加キャラを加える
    const currentSelected = Array.from(document.querySelectorAll('#charaList input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value);
    
    const tempSelectedCharacters = [...currentSelected, additionalCharacter.english];
    
    return await calculateWithCharacters(tempSelectedCharacters);
}

// 追加計算のメイン処理
async function calcAdditional() {
    resetFilter();
    
    // 現在選択されているキャラクターがあるかチェック
    const currentSelected = Array.from(document.querySelectorAll('#charaList input[type="checkbox"]:checked'));
    if (currentSelected.length === 0) {
        alert('まずキャラクターを選択してください。');
        return;
    }
    
    // 残りのキャラクターを取得
    const remainingCharacters = getRemainingCharacters();
    if (remainingCharacters.length === 0) {
        alert('追加計算できるキャラクターがありません。');
        return;
    }
    
    const messageSpan = document.getElementById("processing");
    
    // シード値設定
    seed = parseInt(document.getElementById("seed").value);
    if (seed == -1) { seed = Math.floor(Math.random() * 100000); }
    Math.random.seed(seed);
    
    const results = [];
    const totalCharacters = remainingCharacters.length;
    
    for (let i = 0; i < remainingCharacters.length; i++) {
        const character = remainingCharacters[i];
        
        // 進捗表示
        messageSpan.innerHTML = `追加計算中... ${character.name} (${i + 1}/${totalCharacters})`;
        
        // 進捗率をprocessingエリアに表示
        const progressPercentage = Math.round(((i + 1) / totalCharacters) * 100);
        messageSpan.innerHTML = `追加計算中... ${character.name} (${i + 1}/${totalCharacters}) ${progressPercentage}%`;
        
        await dummyTask();
        
        try {
            const result = await calculateWithAdditionalCharacter(character);
            const achievementRate = result[0] < 0 ? 0 : Math.min((100 * result[0]), 100);
            
            results.push({
                name: character.name,
                rate: achievementRate
            });
        } catch (error) {
            console.error(`計算エラー (${character.name}):`, error);
            results.push({
                name: character.name,
                rate: 0
            });
        }
    }
    
    // 結果を達成率降順でソート
    results.sort((a, b) => b.rate - a.rate);
    
    // 結果を家具明細表示場所に表示
    displayAdditionalResults(results);
    
    messageSpan.innerHTML = `追加計算完了 (${totalCharacters}キャラ計算済み)`;
}

// 2キャラの全組み合わせを生成
function generateTwoCharacterCombinations() {
    const combinations = [];
    for (let i = 0; i < characterNames.length; i++) {
        for (let j = i + 1; j < characterNames.length; j++) {
            combinations.push([characterNames[i], characterNames[j]]);
        }
    }
    return combinations;
}

// 2キャラでの計算処理
async function calculateWithTwoCharacters(char1, char2) {
    const tempSelectedCharacters = [char1.english, char2.english];
    return await calculateWithCharacters(tempSelectedCharacters);
}

// 2キャラ組み合わせ計算のメイン処理
async function calcTwoCombinations() {
    resetFilter();
    
    const messageSpan = document.getElementById("processing");
    
    // シード値設定
    seed = parseInt(document.getElementById("seed").value);
    if (seed == -1) { seed = Math.floor(Math.random() * 100000); }
    Math.random.seed(seed);
    
    // 全組み合わせを生成
    const combinations = generateTwoCharacterCombinations();
    const totalCombinations = combinations.length;
    
    messageSpan.innerHTML = `2キャラ組み合わせ計算準備中... (${totalCombinations}通り)`;
    await dummyTask();
    
    const results = new Map();
    
    for (let i = 0; i < combinations.length; i++) {
        const [char1, char2] = combinations[i];
        
        // 進捗表示
        const progressPercentage = Math.round(((i + 1) / totalCombinations) * 100);
        messageSpan.innerHTML = `2キャラ組み合わせ計算中... ${char1.name}×${char2.name} (${i + 1}/${totalCombinations}) ${progressPercentage}%`;
        
        await dummyTask();
        
        try {
            const result = await calculateWithTwoCharacters(char1, char2);
            const achievementRate = result[0] < 0 ? 0 : Math.min((100 * result[0]), 100);
            
            // マトリクス用のキーを生成
            const key = `${char1.english}_${char2.english}`;
            results.set(key, {
                char1: char1.name,
                char2: char2.name,
                rate: achievementRate
            });
        } catch (error) {
            console.error(`計算エラー (${char1.name}×${char2.name}):`, error);
            const key = `${char1.english}_${char2.english}`;
            results.set(key, {
                char1: char1.name,
                char2: char2.name,
                rate: 0
            });
        }
    }
    
    // 結果をマトリクス形式で表示
    displayTwoCombinationMatrix(results);
    
    messageSpan.innerHTML = `2キャラ組み合わせ計算完了 (${totalCombinations}通り計算済み)`;
}

// マトリクス表示関数（上三角のみ）
function displayTwoCombinationMatrix(results) {
    const selectedRowsDiv = document.getElementById("selectedRows");
    
    let output = '<div><button id="copyButtonMatrix">\
    <i class="fas fa-clipboard">コピー</i>\
    <div id="balloonContainer"/></button></div>\
    <div id="details1" class="details textarea-wrapper">';
    
    // テーブル形式でマトリクスを作成
    output += '<table border="1" style="border-collapse: collapse; font-size: 12px;">';
    
    let copy_txt = '';
    
    // 寮とCSSクラスのマッピング
    const dormClassMap = {
        'ハーツラビュル': 'heartslabyul',
        'サバナクロー': 'savanaclaw',
        'オクタヴィネル': 'octavinelle',
        'スカラビア': 'scarabia',
        'ポムフィオーレ': 'pomefiore',
        'イグニハイド': 'ignihydes',
        'ディアソムニア': 'diasomnia',
        'ナイトレイブンカレッジ': 'nightRavenCollege',
    };

    // ヘッダー行
    output += '<tr><th style="padding: 4px; background-color: #f0f0f0;"></th>';
    copy_txt += '\t';
    
    for (let j = 1; j < characterNames.length; j++) {
        const character = chara_data[characterNames[j].english];
        const dormClass = dormClassMap[character[0]] || '';
        output += `<th class="${dormClass}" style="padding: 4px; writing-mode: vertical-rl; text-orientation: mixed; width: 30px;">${characterNames[j].name}</th>`;
        copy_txt += `${characterNames[j].name}\t`;
    }
    output += '</tr>';
    copy_txt += '\n';
    
    // データ行（上三角のみ）
    for (let i = 0; i < characterNames.length - 1; i++) {
        output += '<tr>';
        const character = chara_data[characterNames[i].english];
        const dormClass = dormClassMap[character[0]] || '';
        output += `<th class="${dormClass}" style="padding: 4px;">${characterNames[i].name}</th>`;
        copy_txt += `${characterNames[i].name}\t`;
        
        for (let j = 1; j < characterNames.length; j++) {
            if (j <= i) {
                output += '<td style="padding: 4px; background-color: #f5f5f5;">-</td>';
                copy_txt += '-\t';
            } else {
                const key = `${characterNames[i].english}_${characterNames[j].english}`;
                const result = results.get(key);
                if (result) {
                    const rate = Math.round(result.rate);
                    let backgroundColor = '';
                    if (rate >= 100) {
                        backgroundColor = 'background-color: #4CAF50;'; // 緑
                    } else if (rate >= 90) {
                        backgroundColor = 'background-color: #87CEEB;'; // 水色
                    }
                    output += `<td style="padding: 4px; text-align: center; ${backgroundColor}">${rate}%</td>`;
                    copy_txt += `${rate}%\t`;
                } else {
                    output += '<td style="padding: 4px; text-align: center;">-</td>';
                    copy_txt += '-\t';
                }
            }
        }
        output += '</tr>';
        copy_txt += '\n';
    }
    
    output += '</table></div>';
    selectedRowsDiv.innerHTML = output;
    
    // コピーボタンのイベントリスナーを設定
    const copyButtonMatrix = document.getElementById("copyButtonMatrix");
    if (copyButtonMatrix) {
        copyButtonMatrix.addEventListener("click", () => {
            const textToCopy = copy_txt;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const balloon = document.createElement("div");
                balloon.className = "balloon";
                balloon.textContent = "マトリクス結果をコピーしました";
                copyButtonMatrix.parentNode.appendChild(balloon);

                const buttonRect = copyButtonMatrix.getBoundingClientRect();
                const balloonRect = balloon.getBoundingClientRect();
                const balloonTop =
                    buttonRect.top +
                    buttonRect.height / 2 -
                    balloonRect.height / 2;
                const balloonLeft = buttonRect.right + 8;

                balloon.style.top = `${balloonTop}px`;
                balloon.style.left = `${balloonLeft}px`;

                setTimeout(() => {
                    balloon.parentNode.removeChild(balloon);
                }, 1000);
            });
        });
    }
}

// 追加計算結果を表示（家具明細の代わりに）
function displayAdditionalResults(results) {
    const selectedRowsDiv = document.getElementById("selectedRows");
    
    let output = '<div><button id="copyButtonAdditional">\
    <i class="fas fa-clipboard">コピー</i>\
    <div id="balloonContainer"/></button></div>\
    <div id="details1" class="details textarea-wrapper">';
    output += '<div style="display: flex;">';
    
    let copy_txt = '';
    
    results.forEach(result => {
        const rate = Math.round(result.rate);
        output += `${result.name}\t${rate}%<br>`;
        copy_txt += `${result.name}\t${rate}%\r\n`;
    });
    
    output += '</div>';
    selectedRowsDiv.innerHTML = output;
    
    // コピーボタンのイベントリスナーを設定
    const copyButtonAdditional = document.getElementById("copyButtonAdditional");
    if (copyButtonAdditional) {
        copyButtonAdditional.addEventListener("click", () => {
            const textToCopy = copy_txt;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const balloon = document.createElement("div");
                balloon.className = "balloon";
                balloon.textContent = "追加計算結果をコピーしました";
                copyButtonAdditional.parentNode.appendChild(balloon);

                const buttonRect = copyButtonAdditional.getBoundingClientRect();
                const balloonRect = balloon.getBoundingClientRect();
                const balloonTop =
                    buttonRect.top +
                    buttonRect.height / 2 -
                    balloonRect.height / 2;
                const balloonLeft = buttonRect.right + 8;

                balloon.style.top = `${balloonTop}px`;
                balloon.style.left = `${balloonLeft}px`;

                setTimeout(() => {
                    balloon.parentNode.removeChild(balloon);
                }, 1000);
            });
        });
    }
}

// 削除機能
function deleteCustomFurniture(furnitureId) {
    const customFurniture = loadCustomFurnitureFromLocalStorage();
    const furniture = customFurniture.find(item => item.id === furnitureId);
    
    if (!furniture) {
        alert('該当する家具が見つかりません。');
        return;
    }
    
    // 削除確認ダイアログ
    const confirmMessage = `「${furniture.name}」を削除してもよろしいですか？`;
    if (confirm(confirmMessage)) {
        const success = deleteCustomFurnitureFromLocalStorage(furnitureId);
        
        if (success) {
            // テーブルを更新
            updateCustomFurnitureTable();
            
            // 家具選択テーブルからも削除（furnitures配列も同時に更新）
            integrateCustomFurnitureWithMainTable();
            
            // カテゴリ別セットを更新
            updateCategorySets();
            
            // 編集中のアイテムが削除された場合、フォームをリセット
            if (window.editingFurnitureId === furnitureId) {
                resetCustomForm();
            }
            
            alert('家具を削除しました。');
        } else {
            alert('家具の削除に失敗しました。');
        }
    }
}

// フォーム送信時の処理
function handleCustomFurnitureSubmit(event) {
    event.preventDefault();
    
    // フォームデータを取得
    const formData = {
        name: document.getElementById('furnitureName').value.trim(),
        category: document.getElementById('furnitureCategory').value,
        theme1: document.getElementById('theme1').value,
        theme1Value: parseInt(document.getElementById('theme1Value').value) || 0,
        theme2: document.getElementById('theme2').value,
        theme2Value: parseInt(document.getElementById('theme2Value').value) || 0,
        dorm: document.getElementById('dorm').value,
        dormValue: parseInt(document.getElementById('dormValue').value) || 0,
        squares: parseInt(document.getElementById('squares').value) || 0
    };
    
    // バリデーション
    const errors = validateCustomFurniture(formData, window.editingFurnitureId);
    
    if (errors.length > 0) {
        displayValidationErrors(errors);
        highlightErrorFields(formData);
        return;
    }
    
    // 面積を自動計算
    const areas = calculateAreas(formData.category, formData.squares);
    
    // 完全な家具データオブジェクトを作成
    const furnitureData = {
        ...formData,
        installArea: areas.install,
        floorArea: areas.floor,
        wallArea: areas.wall,
        isCustom: true
    };
    
    // 編集モードの場合はIDを設定
    if (window.editingFurnitureId) {
        furnitureData.id = window.editingFurnitureId;
    }
    
    // データを保存
    const success = saveCustomFurnitureToLocalStorage(furnitureData);
    
    if (success) {
        // テーブルを更新
        updateCustomFurnitureTable();
        
        // 家具選択テーブルに手入力家具を統合（furnitures配列も同時に更新）
        integrateCustomFurnitureWithMainTable();
        
        // カテゴリ別セットを更新
        updateCategorySets();
        
        // フォームをリセット
        resetCustomForm();
        
        // 成功メッセージ
        const message = window.editingFurnitureId ? '家具を更新しました。' : '家具を保存しました。';
        alert(message);
        
        displayValidationErrors([]);
    } else {
        alert('家具の保存に失敗しました。');
    }
}


// 手入力家具を家具選択テーブルに統合する機能
function integrateCustomFurnitureWithMainTable() {
    if (!table) {
        console.warn('メインテーブルが初期化されていません。');
        return;
    }
    
    // 既存のカスタム家具行を削除
    table.rows().nodes().to$().each(function(index, row) {
        const rowData = table.row(row).data();
        if (rowData && rowData[2] && rowData[2].toString().includes('[カスタム]')) {
            table.row(row).remove();
        }
    });
    
    // furnitures配列からもカスタム家具を削除
    furnitures = furnitures.filter(furniture => furniture[2] !== 'カスタム');
    
    // 手入力家具データを取得
    const customFurniture = loadCustomFurnitureFromLocalStorage();
    
    // 各手入力家具をテーブルに追加
    customFurniture.forEach((furniture, index) => {
        const areas = calculateAreas(furniture.category, furniture.squares);
        
        // furnitures配列の末尾のインデックスを取得
        const furnitureIndex = furnitures.length;
        
        // 家具データを作成（furnitures配列に追加用）- 既存CSVデータ構造に合わせて配置
        const furnitureData = [
            furnitureIndex,                    // 0: No (配列インデックス)
            furniture.name,                    // 1: 名称
            'カスタム',                       // 2: レア
            furniture.category,                // 3: 分類
            areas.install,                     // 4: 設置面積
            areas.floor,                       // 5: 床面積
            areas.wall,                        // 6: 壁面積
            0,                                 // 7: (未使用)
            (furniture.dorm && furniture.dorm !== 'なし' && furniture.dorm !== '') ? (furniture.dormValue || 0) : '',      // 8: 寮値
            (furniture.theme1 && furniture.theme1 !== '－' && furniture.theme1 !== '') ? (furniture.theme1Value || 0) : '',  // 9: テーマ1値
            (furniture.theme2 && furniture.theme2 !== '－' && furniture.theme2 !== '') ? (furniture.theme2Value || 0) : '',  // 10: テーマ2値
            furniture.theme1 || '',            // 11: テーマ1
            furniture.theme2 || '',            // 12: テーマ2
            furniture.dorm || '',              // 13: 寮
            'カスタム家具',                    // 14: シリーズ
            50                                  // 15: 作成可能数
        ];
        
        // furnitures配列に追加
        furnitures.push(furnitureData);
        
        // テーブル表示用のデータを作成
        var add_data = [];
        add_data.push(furnitureIndex); // インデックスをNoとして使用
        
        // 個数入力フィールド
        var max_num = "<td><input type='number' class='have_val' id = 'max_num" + furnitureIndex + "' name='max_num' value='0' min='0' max='99'></td>";
        add_data.push(max_num);
        
        add_data.push(furniture.name + " [カスタム]"); // 名称（カスタム識別子付き）
        add_data.push('カスタム');  // レア
        add_data.push(furniture.category);  // 分類
        add_data.push(furniture.theme1 || ''); // テーマ1
        add_data.push(furniture.theme1Value || 0);  // テーマ1値
        add_data.push(furniture.theme2 || ''); // テーマ2
        add_data.push(furniture.theme2Value || 0);  // テーマ2値
        add_data.push(furniture.dorm || ''); // 寮
        add_data.push(furniture.dormValue || 0);  // 寮値
        add_data.push('カスタム家具'); // シリーズ
        add_data.push(areas.install);  // 設置
        add_data.push(areas.floor);  // 床
        add_data.push(areas.wall); // 壁
        
        table.row.add(add_data);
    });
    
    // テーブルを再描画
    table.draw();
}



// カテゴリ別セットを更新する機能
function updateCategorySets() {
    // セットをリセット
    wall.clear();
    floor.clear();
    front_top.clear();
    front_bot.clear();
    other.clear();
    frame.clear();
    
    // furnitures配列でセットを再作成
    for (let i = 0; i < furnitures.length; i++) {
        let data = furnitures[i];
        
        if (data[3] === "内観・外観：壁紙") {
            wall.add(i);
        } else if (data[3] === "内観・外観：床") {
            floor.add(i);
        } else if (data[3] === "内観・外観：前景") {
            if (data[1].includes("フレーム")) {
                frame.add(i);
                other.add(i);
            } else if (data[1].includes("（上）")) {
                front_top.add(i);
            } else {
                front_bot.add(i);
            }
        } else {
            other.add(i);
        }
    }
}

function saveInputState() {
	// 数値入力フィールドの値を取得してキャッシュに保存
	const inputs = document.querySelectorAll('input[type="number"]');
	for (let i = 0; i < inputs.length; i++) {
	  localStorage.setItem(inputs[i].id, inputs[i].value);
	}
	const copyButton = document.getElementById("checkcache");
	const balloon = document.createElement("div");
	balloon.className = "balloon";
	balloon.textContent = "保存しました";
	copyButton.parentNode.appendChild(balloon);
  
	const buttonRect = copyButton.getBoundingClientRect();
	const balloonRect = balloon.getBoundingClientRect();
	const balloonTop =
	  buttonRect.top +
	  buttonRect.height / 2 -
	  balloonRect.height / 2;
	const balloonLeft = buttonRect.right + 8;
  
	balloon.style.top = `${balloonTop}px`;
	balloon.style.left = `${balloonLeft}px`;
  
	setTimeout(() => {
	  balloon.parentNode.removeChild(balloon);
	}, 1000);
  }
  function setall(){
	const filteredRows = table.rows({ filter: 'applied' }).nodes();
	let setnum = parseInt(document.getElementById("set_val").value)
	 // 各行に対して処理を行う
	 $(filteredRows).each(function() {
		const row = $(this);
		const numCell = row.find('input[type="number"]');
		const minValue = parseInt(numCell.attr('min'));
		const maxValue = parseInt(numCell.attr('max'));
		let newValue = setnum;
		if (newValue < minValue) {
			newValue = minValue;
		} else if (newValue > maxValue) {
			newValue = maxValue;
		}
		numCell.val(newValue);
	  });
  }
  function restoreInputState() {
	// キャッシュから数値入力フィールドの値を取得して復元
	const inputs = document.querySelectorAll('input[type="number"]');
	for (let i = 0; i < inputs.length; i++) {
	  let iid = inputs[i].id;
	  if (!(iid == "rankInput" || localStorage.getItem(iid)==''||localStorage.getItem(iid)==null)){
		  inputs[i].value = localStorage.getItem(iid);
	  }
	}
  }
  
  function resetFilter() {

	for (let i = 1; i <= 14; i++) {
		$('#filter-col'+i.toString()).val(''); // フィルター入力を空にする
		table.column(i-1).search(''); // カラム4の検索条件をクリア
	}
	table.draw();
  }
  window.onload = function() {
	// ボタンの要素を取得する
	var button = document.querySelector('.scroll-to-top');
	// ボタンをクリックしたら最上部にスクロールする
	button.addEventListener('click', function() {
	window.scrollTo({
		top: 0,
		behavior: 'smooth'
	});
	});
	// スクロールしたらボタンを表示する
	window.addEventListener('scroll', function() {
	if (window.scrollY > 100) {
		button.style.display = 'block';
	} else {
		button.style.display = 'none';
	}
	});
	
	// 手入力家具テーブルを初期化
	initializeCustomFurnitureTable();
  };