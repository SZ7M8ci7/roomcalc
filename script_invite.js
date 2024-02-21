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
var dom_name = '';
var theme_1 = '';
var theme_2 = '';

const chara_data = {
	"riddle":["ハーツラビュル","スタイリッシュ","ユニーク"]
	,"ace":["ハーツラビュル","ユニーク","スタイリッシュ"]
	,"deuce":["ハーツラビュル","ベーシック","エレガント"]
	,"trey":["ハーツラビュル","エレガント","ポップ"]
	,"cater":["ハーツラビュル","ポップ","ベーシック"]
	,"leona":["サバナクロー","エレガント","ユニーク"]
	,"jack":["サバナクロー","ベーシック","スタイリッシュ"]
	,"ruggie":["サバナクロー","ポップ","ベーシック"]
	,"azul":["オクタヴィネル","エレガント","スタイリッシュ"]
	,"jade":["オクタヴィネル","スタイリッシュ","ベーシック"]
	,"floyd":["オクタヴィネル","ユニーク","ポップ"]
	,"kalim":["スカラビア","ポップ","ユニーク"]
	,"jamil":["スカラビア","スタイリッシュ","エレガント"]
	,"vil":["ポムフィオーレ","エレガント","スタイリッシュ"]
	,"epel":["ポムフィオーレ","ベーシック","ポップ"]
	,"rook":["ポムフィオーレ","ユニーク","エレガント"]
	,"idia":["イグニハイド","ユニーク","エレガント"]
	,"ortho":["イグニハイド","ユニーク","ポップ"]
	,"malleus":["ディアソムニア","スタイリッシュ","ベーシック"]
	,"silver":["ディアソムニア","ベーシック","エレガント"]
	,"sebek":["ディアソムニア","スタイリッシュ","ユニーク"]
	,"lilia":["ディアソムニア","ポップ","ユニーク"]
	,"grim":["ナイトレイブンカレッジ","ポップ","ベーシック"]
	,"crowley":["ナイトレイブンカレッジ","スタイリッシュ","ベーシック"]
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
		// チェックボックスの状態を取得
		const checkboxes = document.querySelectorAll('input[type="number"]');
		var lines = [];
		lines.push(seed);
		lines.push(Date.now());
		lines.push(document.getElementById('rankInput').value);
		lines.push(document.querySelector('input[name="proctype"]:checked').value);
		lines.push(document.getElementById("trynum").value);
		lines.push(document.getElementById('chara').value);
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
		var lines = $("#text-stats").val().split("\n"); // テキストエリアの値を1行ずつ取得
		$("#rankInput").val(lines[2]);
		var radios = document.getElementsByName("proctype");
		if (lines[3] == '0'){radios[0].checked = true;}
		if (lines[3] == '1'){radios[1].checked = true;}
		if (lines[3] == '2'){radios[2].checked = true;}
		$("#trynum").val(lines[4]);
		$("#chara").val(lines[5]);
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
					const bonus_map = new Map();
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
					{ "orderable": false, "targets": [0] }
				]				
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
		
async function calcstart(){
	const messageSpan = document.getElementById("processing");
	let trynum = parseInt(document.getElementById("trynum").value);
	seed = parseInt(document.getElementById("seed").value);
	if (seed == -1){seed = Math.floor(Math.random() * 100000);}
	Math.random.seed(seed);

	// プルダウンメニュー要素を取得
	var selectElement = document.getElementById("chara");

	// 選択されたオプションのインデックスを取得
	var selectedIndex = selectElement.selectedIndex;

	// 選択されたオプションの値を取得
	var selectedValue = selectElement.options[selectedIndex].value;

	dom_name = chara_data[selectedValue][0];
	theme_1 = chara_data[selectedValue][1];
	theme_2 = chara_data[selectedValue][2];


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
	else {var comfort = '達成率:'+(100*ret[0]).toFixed(2) + '％';}
	var output='<div><button id="copyButton">\
	<i class="fas fa-clipboard">コピー</i>\
	<div id="balloonContainer"/></button></div>\
	<div id="details1" class="details textarea-wrapper">';
	output+='<div style="display: flex;">';
	let copy_txt = '';
	let ret1 = [];
	for (let cur of ret[1]){
		ret1.push(furnitures[cur][1]);
	}
	ret1.sort();
	for (let cur of ret1){
		output+=cur+'<br>';
		copy_txt+=cur+'\r\n';
	}
	output+='</div>';
	$("#selectedRows").html(output);
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
	// プルダウンメニュー要素を取得
	var selectElement = document.getElementById("chara");

	// 選択されたオプションのインデックスを取得
	var selectedIndex = selectElement.selectedIndex;

	// 選択されたオプションの値を取得
	var selectedValue = selectElement.options[selectedIndex].text;
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
		if (theme_1 == theme_1_name || theme_1 == theme_2_name ||
			theme_2 == theme_1_name || theme_2 == theme_2_name ||
			dom_name == domi_name
		){
			var point = 0;
			if (theme_1 == theme_1_name){point+=parseInt(rowData[6])}
			if (theme_1 == theme_2_name){point+=parseInt(rowData[8])}
			if (theme_2 == theme_1_name){point+=parseInt(rowData[6])/2}
			if (theme_2 == theme_2_name){point+=parseInt(rowData[8])/2}
			if (dom_name == domi_name){point+=parseInt(rowData[10])}
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
	let dormitory_val = 0;
	let themes_val = 0;
	let place_area = 0;
	let floor_area = 0;
	let wall_area = 0;
	const countMap = new Map();
	for (let i = 0; i < data_list.length; i++) {
		let num = data_list[i];
		countMap.set(num, (countMap.get(num) || 0) + 1);
		let data = furnitures[num];
		place_area += parseInt(data[4]) ? parseInt(data[4]) : 0;
		floor_area += parseInt(data[5]) ? parseInt(data[5]) : 0;
		wall_area += parseInt(data[6]) ? parseInt(data[6]) : 0;
		if (data[11] == theme_1){themes_val+=parseFloat(data[9]) ? parseFloat(data[9]) : 0}
		if (data[12] == theme_1){themes_val+=parseFloat(data[10]) ? parseFloat(data[10]) : 0}
		if (data[11] == theme_2){themes_val+=parseFloat(data[9])/2 ? parseFloat(data[9])/2 : 0}
		if (data[12] == theme_2){themes_val+=parseFloat(data[10])/2 ? parseFloat(data[10])/2 : 0}
		if (data[13] == dom_name){dormitory_val+=parseInt(data[8]) ? parseInt(data[8]) : 0}
	}
	// プルダウンメニュー要素を取得
	var selectElement = document.getElementById("dom_grade");
	var selectedIndex = selectElement.selectedIndex;
	var selectedValue = selectElement.options[selectedIndex].value;
	var dom_line = dom_judge[selectedValue];
	var ret_dom = 0;
	if (dormitory_val >= dom_line){
		ret_dom = 1;
	} else {
		ret_dom = dormitory_val/dom_line
	}
	// プルダウンメニュー要素を取得
	var selectElement = document.getElementById("theme_grade");
	var selectedIndex = selectElement.selectedIndex;
	var selectedValue = selectElement.options[selectedIndex].value;
	var theme_line = theme_judge[selectedValue];
	var ret_theme = 0;
	if (themes_val >= theme_line){
		ret_theme = 1;
	} else {
		ret_theme = themes_val/theme_line;
	}
	if (wall_area > max_wall_num.get(room_rank)) {base_point *= 0.25**(wall_area - max_wall_num.get(room_rank))}
	if (floor_area > max_floor_num.get(room_rank))  {base_point *= 0.25**(floor_area - max_floor_num.get(room_rank))}
	if (place_area > max_floor_num.get(room_rank))  {base_point *= 0.25**(place_area - max_floor_num.get(room_rank))}
	if (data_list.filter(element => frame.has(element)).length > 1) {base_point *= 0.25}
	for (const key of countMap.keys()) {
		if (countMap.get(key) > selected_maxval[key]) {base_point *= 0.25**(countMap.get(key) - selected_maxval[key])}
	}
	return base_point*ret_theme*ret_dom;
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
	let currentSolution = initializeSolution(room_rank); // 解の初期化

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
function initializeSolution(room_rank) {
	var max_furniture = max_furniture_num.get(room_rank)
	var ret = chooseRandomElements(selected_floor_list,1).concat(
		chooseRandomElements(selected_wall_list,1)
		,chooseRandomElements(selected_front_top_list,2)
		,chooseRandomElements(selected_front_bot_list,2));
	ret = ret.concat(chooseRandomElements(selected_other_list,max_furniture-ret.length));
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
	  if (!(localStorage.getItem(iid)==''||localStorage.getItem(iid)==null)){
		  inputs[i].value = localStorage.getItem(iid);
	  }
	}
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