// 検索欄と併用できる、列ごとの完全一致フィルター。
function initializeTableValueFilters(table) {
    const tableNode = table.table().node();
    const filters = [];
    const collator = new Intl.Collator('ja', { numeric: true });

    function cellValue(cell) {
        const input = cell.querySelector('input[type="number"]');
        return input ? input.value : cell.textContent.trim();
    }

    $(tableNode).find('thead input[type="text"]').each(function() {
        const columnIndex = Number(this.id.replace('filter-col', '')) - 1;
        const label = this.placeholder;
        const select = document.createElement('select');
        select.id = 'value-filter-col' + (columnIndex + 1);
        select.className = 'column-value-filter';
        select.setAttribute('aria-label', label + 'の値で絞り込み');
        select.title = label + 'の値で絞り込み（検索と併用できます）';
        this.setAttribute('aria-label', label + 'を検索');
        this.insertAdjacentElement('afterend', select);
        $(select).on('click keydown', function(event) {
            event.stopPropagation();
        }).on('change', function() {
            table.draw();
        });
        filters.push({ columnIndex, select, signature: null });
    });

    function refresh() {
        filters.forEach(function(filter) {
            const values = new Set(table.column(filter.columnIndex).nodes().toArray().map(cellValue));
            // 個数変更などで該当行がなくなっても、選択中の条件は保持する。
            const selected = filter.select.value;
            if (selected !== '') values.add(JSON.parse(selected));
            const sorted = Array.from(values).sort(collator.compare);
            const signature = JSON.stringify(sorted);
            if (filter.signature === signature) return;
            filter.signature = signature;
            filter.select.replaceChildren(new Option('すべて', ''));
            sorted.forEach(function(value) {
                // 空欄と「すべて」を区別し、記号を含む値もそのまま扱う。
                filter.select.add(new Option(value === '' ? '（空欄）' : value, JSON.stringify(value)));
            });
            filter.select.value = selected;
        });
    }

    const matchesValues = function(settings, data, dataIndex) {
        if (settings.nTable !== tableNode) return true;
        const row = table.row(dataIndex).node();
        return filters.every(function(filter) {
            return filter.select.value === '' ||
                cellValue(row.cells[filter.columnIndex]) === JSON.parse(filter.select.value);
        });
    };
    $.fn.dataTable.ext.search.push(matchesValues);
    $(tableNode).on('draw.dt.valueFilters', refresh);
    $(tableNode).on('change.valueFilters', 'tbody input[type="number"]', function() {
        table.draw();
    });
    refresh();

    return {
        reset: function() {
            filters.forEach(function(filter) { filter.select.value = ''; });
        }
    };
}
