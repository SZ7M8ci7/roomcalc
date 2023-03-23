var selectedRows = {}; // 選択された行の状態を保存するためのオブジェクトを定義する
var table = null; // 初期化
var furnitures = [];
const series_bonus = new Map();
var max_furniture_num = new Map();
var max_floor_num = new Map();
var max_wall_num = new Map();
let wall = new Set();
let floor = new Set();
let front_top = new Set();
let front_bot = new Set();
let other = new Set();
let selected_wall = new Set();
let selected_floor = new Set();
let selected_front_top = new Set();
let selected_front_bot = new Set();
let selected_other = new Set();
let must_wall = new Set();
let must_floor = new Set();
let must_front_top = new Set();
let must_front_bot = new Set();
let must_other = new Set();
let selected_wall_list = [];
let selected_floor_list = [];
let selected_front_top_list = [];
let selected_front_bot_list = [];
let selected_other_list = [];
let must_wall_list = [];
let must_floor_list = [];
let must_front_top_list = [];
let must_front_bot_list = [];
let must_other_list = [];


$(document).ready(function() {

	$("#btn-check").click(function(){
		var lines = Array.from(new Set($("#text-area").val().split("\n"))); // テキストエリアの値を1行ずつ取得
		var checkboxes = $("input[type='checkbox']"); // 全てのチェックボックスを取得
		$.each(checkboxes, function(index, checkbox){ // 各チェックボックスに対して処理を行う
			var value = $(checkbox).attr("id"); // チェックボックスの名前を取得
			if(lines.includes(value)){ // テキストエリアの行に名前が含まれている場合
				$(checkbox).prop("checked", true); // チェックボックスをオンにする
				lines.splice(lines.indexOf(value), 1); // テキストエリアの対象行を削除する
			}
		});
		$("#text-area").val(lines.join("\n")); // テキストエリアに残った行を再度設定する
	});
	
	$.ajax({
		type: "GET",
		url: "series.csv",
		dataType: "text",
		success: function (data) {
			const lines = data.split("\r\n");
			for (let i = 0; i < lines.length; i++) {
				if (lines[i]) {
					const row_data = lines[i].split(",");
					const series_name = row_data[0];
					const bonus_map = new Map();
					for (let j = 1; j < row_data.length; j++) {
						const bonus = row_data[j] === "" ? 0 : parseFloat(row_data[j]);
						bonus_map.set(j - 1, bonus);
					}
					series_bonus.set(series_name, bonus_map);
				}
			}
		}
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
					{ "targets": [2, 6, 7, 8, 9, 10, 11, 12], "className": "hidden" },
					{ "orderable": false, "targets": [0,1] }
				]				
            });
            for (var i = 0; i < lines.length; i++) {
                if (i !== lines.length - 1 || lines[i]) { // 最終行でない場合か、最終行でも空でない場合
                    var row_data = lines[i].split(",");
					furnitures.push(row_data)
                    var checkbox = "<td><input type='checkbox' id = '" + row_data[1] + "' name='select[]' class='check' value='" + i + "'></td>";
                    var mustcheckbox = "<td><input type='checkbox' id = 'must" + row_data[1] + "' name='mustselect[]' class='check' value='" + i + "'></td>";
                    row_data.unshift(mustcheckbox);
                    row_data.unshift(checkbox);
                    table.row.add(row_data);
                    // 選択された行の状態を保存する
                    if (selectedRows[i]) {
                        table.row(i).select();
                    }
                }
            }
			for (let i = 0; i < furnitures.length; i++) {
				let data = furnitures[i];
				if (data[5] === "内観・外観：壁紙") {
				  wall.add(i);
				} else if (data[5] === "内観・外観：床") {
				  floor.add(i);
				} else if (data[5] === "内観・外観：前景") {
					if (data[3].includes("（上）")) {
						front_top.add(i);
					} else {
						front_bot.add(i);
					}
				} else {
				  other.add(i);
				}
			  }
			// 全選択のチェックボックスを追加する
			var headerCheckbox =
				"<th><input type='checkbox' name='select_all' id='select-all'><br></th>";
			table.column(0).header().innerHTML = headerCheckbox + table.column(0).header().innerHTML;
		  
			  // 全選択のチェックボックスをクリックした時の処理を追加する
			$("#select-all").click(function () {
				$("input[name='select[]']").prop("checked", this.checked);
			});
            table.draw();
			restoreCheckboxState();
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
	let trynum = parseInt(document.getElementById("trynum").value)
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
	var comfort = 'いごこち度:'+ret[0];
	var output='<div><button id="copyButton">\
	<i class="fas fa-clipboard">コピー</i>\
	<div id="balloonContainer"/></button></div>\
	<div id="details1" class="details textarea-wrapper">';
	output+='<div style="display: flex;">';
	let copy_txt = '';
	let ret1 = [];
	for (let cur of ret[1]){
		ret1.push(furnitures[cur][3]);
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
	must_wall = new Set();
	must_floor = new Set();
	must_front_top = new Set();
	must_front_bot = new Set();
	must_other = new Set();
	must_wall_list = [];
	must_floor_list = [];
	must_front_top_list = [];
	must_front_bot_list = [];
	must_other_list = [];
	   
    table.search('').draw(); // search欄の値を空にすることでテーブルを全件表示する
    var selectedRows = $('input.check:checked').parents('tr');

	var selectedData = []; // 選択された行のデータを格納するリストを初期化する
	var mustData = []
    selectedRows.each(function () {
        var rowData = [];
		$(this).find('td').each(function () {
			if ($(this).index() == 1) {
				rowData.push($(this).find('input[type="checkbox"]').prop('checked'));
			} else {
				rowData.push($(this).text());
			}
		});
		var no = parseInt(rowData[2]);
		if (rowData[1]){
			mustData.push(no);
			if (wall.has(no)){must_wall.add(no);}
			if (floor.has(no)){must_floor.add(no);}
			if (front_top.has(no)){must_front_top.add(no);}
			if (front_bot.has(no)){must_front_bot.add(no);}
			if (other.has(no)){must_other.add(no);}        
		}
		else {
			selectedData.push(no); // リストに行のデータを追加する
			if (wall.has(no)){selected_wall.add(no);}
			if (floor.has(no)){selected_floor.add(no);}
			if (front_top.has(no)){selected_front_top.add(no);}
			if (front_bot.has(no)){selected_front_bot.add(no);}
			if (other.has(no)){selected_other.add(no);}        
			}
    });
	var room_rank = parseInt(document.getElementById('rankInput').value);
	let ret = simulatedAnnealing(selectedData, mustData, room_rank);
	return ret;
}
  
function cost(data_list, room_rank) {
	let base_point = 0;
	let theme_point = 0;
	let dom_point = 0;
	let series_point = 0;
	let dormitory_nums = {};
	let themes_nums = {};
	let series_nums = {};
	let dormitory_point = 0;
	let place_area = 0;
	let floor_area = 0;
	let wall_area = 0;
	for (let i = 0; i < data_list.length; i++) {
		let num = data_list[i];
		let data = furnitures[num];
		place_area += parseInt(data[6]);
		floor_area += parseInt(data[7]);
		wall_area += parseInt(data[8]);
		base_point += parseFloat(data[9]);
		dormitory_point += parseFloat(data[10]);
		themes_nums[data[13]] = (themes_nums[data[13]] || 0) + 1;
		themes_nums[data[14]] = (themes_nums[data[14]] || 0) + 1;
		dormitory_nums[data[15]] = (dormitory_nums[data[15]] || 0) + 1;
		series_nums[data[16]] = (series_nums[data[16]] || 0) + 1;
	}
	for (let key in themes_nums) {
		if (key === "－") {
			continue;
		}
		theme_point += Math.max(0, 15 * Math.min(themes_nums[key] - 7, 23));
	}
	for (let key in dormitory_nums) {
		if (key === "なし") {
			continue;
		}
		dom_point += Math.max(0, 25 * Math.min(dormitory_nums[key] - 7, 23));
	}
	for (let key in series_nums) {
		if (key === "－") {
			continue;
		}
		sb = series_bonus.get(key)
		series_point += sb.get(series_nums[key]);
	}
	let penalty = Math.max(0, 10 - (max_furniture_num.get(room_rank) - data_list.length));
	if (wall_area > max_wall_num.get(room_rank)) {
		base_point -= 9999*(wall_area-max_wall_num.get(room_rank));
	}
	if (floor_area > max_floor_num.get(room_rank)) {
		base_point -= 9999*(floor_area-max_floor_num.get(room_rank));
	}
	if (place_area > max_floor_num.get(room_rank)) {
		base_point -= 9999*(place_area-max_floor_num.get(room_rank));
	}
	return base_point + theme_point + dom_point + series_point - penalty * (penalty + 2) + dormitory_point;
}
  // 焼きなまし法
function simulatedAnnealing(selected_data,must_data,room_rank) {
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

	selected_wall_list = Array.from(selected_wall);
	selected_floor_list = Array.from(selected_floor);
	selected_front_top_list = Array.from(selected_front_top);
	selected_front_bot_list = Array.from(selected_front_bot);
	selected_other_list = Array.from(selected_other);
	must_wall_list = Array.from(must_wall);
	must_floor_list = Array.from(must_floor);
	must_front_top_list = Array.from(must_front_top);
	must_front_bot_list = Array.from(must_front_bot);
	must_other_list = Array.from(must_other);
	const initialTemperature = 10000; // 初期温度
	const finalTemperature = 0.1; // 終了温度
	coolingRate = proc_dict[coolingRate]; // 冷却率
	let currentSolution = initializeSolution(must_data,room_rank); // 解の初期化

	let currentCost = cost(must_data.concat(currentSolution),room_rank);
	let bestSolution = currentSolution.slice(); // 最適解
	let bestCost = currentCost;

	let temperature = initialTemperature;

	while (temperature > finalTemperature) {
		// 新しい解を生成
		let newSolution = generateNewSolution(currentSolution);

		// 新しい解のコストを計算
		let newCost = cost(must_data.concat(newSolution),room_rank);
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

	return [bestCost,bestSolution.concat(must_data)];
}

// 初期解の生成
function initializeSolution(must_data,room_rank) {
	var max_furniture = max_furniture_num.get(room_rank)
	var ret = chooseRandomElements(selected_floor,1-must_floor_list.length).concat(
		chooseRandomElements(selected_wall,1-must_wall_list.length)
		,chooseRandomElements(selected_front_top,2-must_front_top_list.length)
		,chooseRandomElements(selected_front_bot,2-must_front_bot_list.length));
	ret = ret.concat(chooseRandomElements(selected_other,max_furniture-ret.length-must_data.length));
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
	const diffArray = arr1.filter(x => !arr2.includes(x));
	if (diffArray.length == 0){return next_solution}
	add_index = Math.floor(Math.random() * diffArray.length); // ランダムなインデックスを取得
	add_item = diffArray[add_index]; // ランダムに選択された要素を取得
	next_solution.push(add_item);
	return next_solution;
}

// 受理確率の計算
function calculateAcceptanceProbability(currentCost, newCost, temperature) {
	if (newCost > currentCost) {
		return 1;
	}
	const delta = currentCost - newCost;
	return Math.exp(-delta / temperature);
}
function saveCheckboxState() {
	// チェックボックスの状態を取得してキャッシュに保存
	const checkboxes = document.querySelectorAll('input[type="checkbox"]');
	for (let i = 0; i < checkboxes.length; i++) {
	  localStorage.setItem(checkboxes[i].id, checkboxes[i].checked);
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

  function restoreCheckboxState() {
	// キャッシュからチェックボックスの状態を取得して復元
	const checkboxes = document.querySelectorAll('input[type="checkbox"]');
	for (let i = 0; i < checkboxes.length; i++) {
	  let cid = checkboxes[i].id;
	  cid = cid.replace('二人掛けソファ','二人掛けのソファ');
	  cid = cid.replace('体育館の前景','体育館の全景');
	  cid = cid.replace('ベーシックな','ベーシックなな');
	  cid = cid.replace('オンボロ風の小さい机','オンボロ風の小さな机');
	  checkboxes[i].checked = (localStorage.getItem(cid) === 'true' || localStorage.getItem(checkboxes[i].id) === 'true');
	}
  }
  window.onload = function() {
	restoreCheckboxState();
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