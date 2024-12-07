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
let frame = new Set();
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
var seed = Math.floor(Math.random() * 100000);


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
	$("#btn-stats-out").click(function(){
		resetFilter();
		// チェックボックスの状態を取得
		const checkboxes = document.querySelectorAll('input[type="checkbox"]');
		var lines = [];
		lines.push(seed);
		lines.push(Date.now());
		lines.push(document.getElementById('rankInput').value);
		lines.push(document.querySelector('input[name="proctype"]:checked').value);
		lines.push(document.getElementById("trynum").value);
		
		var last_checked = null;
		var stats_all = '';
		$.each(checkboxes, function(index, checkbox){ // 各チェックボックスに対して処理を行う
			var cid = $(checkbox).attr("id"); // チェックボックスの名前を取得
			if (cid != 'select-all' && 
				cid != 'filter-all-select' && 
				cid != 'filter-all-nonselect' && 
				cid != 'filter-must-select' && 
				cid != 'filter-must-nonselect') {
				if (cid.match(/must/)){
					stats_all += (last_checked + '' + checkbox.checked).replaceAll('true','1').replaceAll('false','0');
				}
				last_checked = checkbox.checked;
			}
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
		var checkboxes = $("input[type='checkbox']"); // 全てのチェックボックスを取得
		$.each(checkboxes, function(index, checkbox){ // 各チェックボックスに対して処理を行う
			var check_id = $(checkbox).attr("id"); // チェックボックスの名前を取得
			var check_value = parseInt($(checkbox).attr("value"),10);
			if (check_id.match(/must/)){
				$(checkbox).prop("checked", lines[5][2*check_value+1]=='1'); // チェックボックスをオンにする
			} else {
				$(checkbox).prop("checked", lines[5][2*check_value]=='1'); // チェックボックスをオンにする
			}
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
					{ "orderable": false, "targets": [0,1,3,4,5,13,14,15,16] }
				]				
            });
			$('#myTable thead th input[type="text"]').on('click', function(e) {
				e.stopPropagation(); // デフォルトのソート切り替えを停止
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
					if (data[3].includes("フレーム")) {
						frame.add(i);
						other.add(i);
					} else if (data[3].includes("（上）")) {
						front_top.add(i);
					} else {
						front_bot.add(i);
					}
				} else {
				  other.add(i);
				}
			  }
		  
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
    // カスタムフィルターを設定
    $.fn.dataTable.ext.search.push(function(settings, data, dataIndex) {
        var filterAllChecked = $('#filter-all-select').prop('checked');
        var filterMustChecked = $('#filter-must-select').prop('checked');
        var filterAllNonChecked = $('#filter-all-nonselect').prop('checked');
        var filterMustNonChecked = $('#filter-must-nonselect').prop('checked');

        // 行ごとのチェックボックス状態を正確に取得
        var rowNode = table.row(dataIndex).node();
        var allSelectChecked = $(rowNode).find('input[name="select[]"]').prop('checked');
        var mustSelectChecked = $(rowNode).find('input[name="mustselect[]"]').prop('checked');

        // 全選択フィルタの適用
        if (filterAllChecked && !allSelectChecked) {
            return false; // 全選択フィルタがオンの場合、チェックされていない行は非表示
        }
        // 全未選択フィルタの適用
        if (filterAllNonChecked && allSelectChecked) {
            return false; // 全未選択フィルタがオンの場合、チェックされている行は非表示
        }
        // 必須フィルタの適用
        if (filterMustChecked && !mustSelectChecked) {
            return false; // 必須フィルタがオンの場合、チェックされていない行は非表示
        }
        // 必須未選択フィルタの適用
        if (filterMustNonChecked && mustSelectChecked) {
            return false; // 必須フィルタがオンの場合、チェックされていない行は非表示
        }

        return true; // 該当しない行は表示
    });

    // チェックボックスのイベントリスナーを追加
    $(document).on('change', '#filter-all-select', function() {
        table.draw();
    });

    $(document).on('change', '#filter-must-select', function() {
        table.draw();
    });
	$(document).on('change', '#filter-all-nonselect', function() {
        table.draw();
    });

    $(document).on('change', '#filter-must-nonselect', function() {
        table.draw();
    });
    $('#filter-col4').on('keyup change', function() {
        table.column(3).search(this.value).draw();
    });
	$('#filter-col5').on('keyup change', function() {
		var searchTerm = this.value;
		if (searchTerm) {
			// Add `^` and `$` to enforce exact match
			table.column(4).search('^' + searchTerm + '$', true, false).draw();
		} else {
			// If the search term is empty, clear the filter
			table.column(4).search('').draw();
		}
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
    $('#filter-col16').on('keyup change', function() {
        table.column(15).search(this.value).draw();
    });
    $('#filter-col17').on('keyup change', function() {
        table.column(16).search(this.value).draw();
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
	resetFilter();
	const messageSpan = document.getElementById("processing");
	let trynum = parseInt(document.getElementById("trynum").value)
	seed = parseInt(document.getElementById("seed").value)
	if (seed == -1){seed = Math.floor(Math.random() * 100000);}
	Math.random.seed(seed);
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
	if (ret[0] < 0){var comfort = '部屋の条件を満たせませんでした。選択家具が少な過ぎたり、必須家具を過剰に選択していないか確認してください。';}
	else {var comfort = 'いごこち度:'+ret[0];}
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
	if (mustData.length > max_furniture_num.get(room_rank)) {
		return [-1,[]];
	}
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
		place_area += parseInt(data[6]) ? parseInt(data[6]) : 0;
		floor_area += parseInt(data[7]) ? parseInt(data[7]) : 0;
		wall_area += parseInt(data[8]) ? parseInt(data[8]) : 0;
		base_point += parseFloat(data[9]) ? parseFloat(data[9]) : 0;
		dormitory_point += parseFloat(data[10]) ? parseFloat(data[10]) : 0;
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
	let penalty = 0;
	if (room_rank >= 31){
		penalty = 0;
	} else {
		penalty = Math.max(0, 10 - (max_furniture_num.get(room_rank) - data_list.length));
	}
	if (wall_area > max_wall_num.get(room_rank)) {base_point -= 9999*(wall_area-max_wall_num.get(room_rank));}
	if (floor_area > max_floor_num.get(room_rank)) {base_point -= 9999*(floor_area-max_floor_num.get(room_rank));}
	if (place_area > max_floor_num.get(room_rank)) {base_point -= 9999*(place_area-max_floor_num.get(room_rank));}
	if (data_list.filter(element => frame.has(element)).length > (room_rank >= 31 ? 2 : 1)){base_point -= 9999};
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
	const initialTemperature = 1000; // 初期温度
	const finalTemperature = 0.01; // 終了温度
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
	var ret = chooseRandomElements(selected_floor,(room_rank >= 31 ? 2 : 1)-must_floor_list.length).concat(
		chooseRandomElements(selected_wall,(room_rank >= 31 ? 2 : 1)-must_wall_list.length)
		,chooseRandomElements(selected_front_top,(room_rank >= 31 ? 4 : 2)-must_front_top_list.length)
		,chooseRandomElements(selected_front_bot,(room_rank >= 31 ? 4 : 2)-must_front_bot_list.length));
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
  
  function resetFilter() {

    $('#filter-all-select').prop('checked', false);
    $('#filter-must-select').prop('checked', false);
    $('#filter-all-nonselect').prop('checked', false);
    $('#filter-must-nonselect').prop('checked', false);

	for (let i = 4; i <= 17; i++) {
		$('#filter-col'+i.toString()).val(''); // フィルター入力を空にする
		table.column(i-1).search(''); // カラム4の検索条件をクリア
	}
	table.draw();
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