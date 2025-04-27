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
	let ret1 = [];
	for (let cur of ret[1]) {
		ret1.push(furnitures[cur][1]);
	}
	let countMap = {};
	for (let item of ret1) {
		countMap[item] = (countMap[item] || 0) + 1;
	}
	let sortedKeys = Object.keys(countMap).sort();
	for (let key of sortedKeys) {
		if (countMap[key] === 1) {
			output += `${key}<br>`;
			copy_txt += `${key}\r\n`;
		} else {
			output += `${key}\t${countMap[key]}<br>`;
			copy_txt += `${key}\t${countMap[key]}\r\n`;
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
		2: 0.9999
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
  };