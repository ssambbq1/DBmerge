window.addEventListener('DOMContentLoaded', function() {
  // CSV 파싱/생성 유틸
  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const obj = {};
      headers.forEach((h, i) => obj[h] = values[i]);
      return obj;
    });
  }
  function toCSV(data, columns) {
    const header = columns.join(',');
    const rows = data.map(row => columns.map(col => row[col] ?? '').join(','));
    return [header, ...rows].join('\n');
  }

  // 첫번째, 두번째 테이블 데이터
  let table1 = [];
  let table2 = [];
  let mergedTable = [];
  let mergedMark = {}; // {rowIdx_col: true}
  let mergedColumns = [];

  const tableContainer1 = document.getElementById('tableContainer1');
  const tableContainer2 = document.getElementById('tableContainer2');
  const mergedTableContainer = document.getElementById('mergedTableContainer');
  const fileInput1 = document.getElementById('fileInput1');
  const fileInput2 = document.getElementById('fileInput2');
  const loadBtn1 = document.getElementById('loadBtn1');
  const loadBtn2 = document.getElementById('loadBtn2');
  const saveJsonBtn = document.getElementById('saveJsonBtn');
  const saveCsvBtn = document.getElementById('saveCsvBtn');
  const mergeKeyInput = document.getElementById('mergeKey');
  const mergeBtn = document.getElementById('mergeBtn');
  const showPasteAreaBtn = document.getElementById('showPasteAreaBtn');
  const pasteAreaContainer = document.getElementById('pasteAreaContainer');
  const pasteArea = document.getElementById('pasteArea');
  const addPastedTableBtn = document.getElementById('addPastedTableBtn');
  const closePasteAreaBtn = document.getElementById('closePasteAreaBtn');

  // 첫번째 테이블 붙여넣기
  const pasteToTable1Btn = document.getElementById('pasteToTable1Btn');
  const pasteToTable1Area = document.getElementById('pasteToTable1Area');
  const pasteToTable1Textarea = document.getElementById('pasteToTable1Textarea');
  const applyPasteToTable1Btn = document.getElementById('applyPasteToTable1Btn');
  const closePasteToTable1Btn = document.getElementById('closePasteToTable1Btn');

  pasteToTable1Btn.onclick = () => {
    pasteToTable1Area.style.display = 'block';
    pasteToTable1Textarea.value = '';
    pasteToTable1Textarea.focus();
  };
  closePasteToTable1Btn.onclick = () => {
    pasteToTable1Area.style.display = 'none';
  };
  applyPasteToTable1Btn.onclick = () => {
    const text = pasteToTable1Textarea.value.trim();
    if (!text) return alert('붙여넣을 데이터를 입력하세요.');
    let data;
    try {
      if (text.startsWith('[')) {
        data = JSON.parse(text);
      } else {
        data = parsePastedTable(text);
      }
    } catch (e) {
      return alert('붙여넣기 데이터 파싱 오류: ' + e.message);
    }
    table1 = data;
    renderTable(tableContainer1, table1, getAllColumns(table1));
    pasteToTable1Area.style.display = 'none';
  };

  // 두번째 테이블 붙여넣기
  const pasteToTable2Btn = document.getElementById('pasteToTable2Btn');
  const pasteToTable2Area = document.getElementById('pasteToTable2Area');
  const pasteToTable2Textarea = document.getElementById('pasteToTable2Textarea');
  const applyPasteToTable2Btn = document.getElementById('applyPasteToTable2Btn');
  const closePasteToTable2Btn = document.getElementById('closePasteToTable2Btn');

  pasteToTable2Btn.onclick = () => {
    pasteToTable2Area.style.display = 'block';
    pasteToTable2Textarea.value = '';
    pasteToTable2Textarea.focus();
  };
  closePasteToTable2Btn.onclick = () => {
    pasteToTable2Area.style.display = 'none';
  };
  applyPasteToTable2Btn.onclick = () => {
    const text = pasteToTable2Textarea.value.trim();
    if (!text) return alert('붙여넣을 데이터를 입력하세요.');
    let data;
    try {
      if (text.startsWith('[')) {
        data = JSON.parse(text);
      } else {
        data = parsePastedTable(text);
      }
    } catch (e) {
      return alert('붙여넣기 데이터 파싱 오류: ' + e.message);
    }
    table2 = data;
    renderTable(tableContainer2, table2, getAllColumns(table2));
    pasteToTable2Area.style.display = 'none';
  };

  function getAllColumns(...tables) {
    const set = new Set();
    tables.forEach(table => table.forEach(row => Object.keys(row).forEach(col => set.add(col))));
    return Array.from(set);
  }

  function renderTable(container, data, columns) {
    if (!data || data.length === 0) {
      container.innerHTML = '<p>데이터가 없습니다.</p>';
      return;
    }
    let html = '<table><thead><tr>';
    columns.forEach(col => {
      html += `<th>${col}</th>`;
    });
    html += '</tr></thead><tbody>';
    data.forEach(row => {
      html += '<tr>';
      columns.forEach(col => {
        html += `<td>${row[col] ?? ''}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  }

  function renderMergedTable() {
    let html = '';
    if (mergedColumns && mergedColumns.length > 0) {
      html += '<table><thead><tr>';
      mergedColumns.forEach(col => {
        html += `<th>${col}</th>`;
      });
      html += '</tr></thead><tbody>';
      if (mergedTable && mergedTable.length > 0) {
        mergedTable.forEach((row, rowIdx) => {
          html += '<tr>';
          mergedColumns.forEach(col => {
            const markKey = rowIdx + '_' + col;
            if (mergedMark[markKey]) {
              html += `<td class="merged">${row[col] ?? ''}</td>`;
            } else {
              html += `<td>${row[col] ?? ''}</td>`;
            }
          });
          html += '</tr>';
        });
      } else {
        html += `<tr><td colspan="${mergedColumns.length}" style="text-align:center;">병합 결과가 없습니다.</td></tr>`;
      }
      html += '</tbody></table>';
    } else {
      html = '<p>병합 결과가 없습니다.</p>';
    }
    mergedTableContainer.innerHTML = html;
  }

  // 파일 불러오기
  loadBtn1.onclick = () => {
    if (!fileInput1.files[0]) return alert('첫번째 파일을 선택하세요.');
    const file = fileInput1.files[0];
    const reader = new FileReader();
    reader.onload = e => {
      let data;
      if (file.name.endsWith('.json')) {
        data = JSON.parse(e.target.result);
      } else if (file.name.endsWith('.csv')) {
        data = parseCSV(e.target.result);
      } else {
        return alert('지원하지 않는 파일 형식입니다.');
      }
      table1 = data;
      renderTable(tableContainer1, table1, getAllColumns(table1));
    };
    reader.readAsText(file);
  };

  loadBtn2.onclick = () => {
    if (!fileInput2.files[0]) return alert('두번째 파일을 선택하세요.');
    const file = fileInput2.files[0];
    const reader = new FileReader();
    reader.onload = e => {
      let data;
      if (file.name.endsWith('.json')) {
        data = JSON.parse(e.target.result);
      } else if (file.name.endsWith('.csv')) {
        data = parseCSV(e.target.result);
      } else {
        return alert('지원하지 않는 파일 형식입니다.');
      }
      table2 = data;
      renderTable(tableContainer2, table2, getAllColumns(table2));
    };
    reader.readAsText(file);
  };

  // 병합
  mergeBtn.onclick = () => {
    const key = mergeKeyInput.value.trim();
    if (!key) return alert('병합 기준 컬럼명을 입력하세요.');
    if (!table1.length || !table2.length) return alert('두 테이블 모두 불러와야 합니다.');
    const map = new Map();
    mergedMark = {};
    mergedColumns = getAllColumns(table1, table2);
    let result = [];
    // table1 먼저
    table1.forEach(row => {
      const k = String(row[key]);
      const newRow = {...row};
      map.set(k, {row: newRow, from1: true});
      result.push(newRow);
    });
    // table2: key가 이미 있으면 병합, 없으면 추가
    table2.forEach(row => {
      const k = String(row[key]);
      if (map.has(k)) {
        const exist = map.get(k).row;
        mergedColumns.forEach(col => {
          // 오직 값이 다를 때만 마킹 (중첩된 데이터)
          if (row[col] !== undefined && row[col] !== exist[col]) {
            exist[col] = row[col];
            const idx = result.indexOf(exist);
            mergedMark[idx + '_' + col] = true;
          }
        });
      } else {
        // 새로 추가된 row에는 마킹 없음
        const newRow = {...row};
        result.push(newRow);
      }
    });
    mergedTable = result;
    renderMergedTable();
  };

  // 병합 결과 저장
  saveJsonBtn.onclick = () => {
    const data = mergedTable;
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mergedTable.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  saveCsvBtn.onclick = () => {
    const data = mergedTable;
    const columns = mergedColumns;
    const csv = toCSV(data, columns);
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mergedTable.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 붙여넣기 영역 토글
  showPasteAreaBtn.onclick = () => {
    pasteAreaContainer.style.display = 'block';
    pasteArea.value = '';
    pasteArea.focus();
  };
  closePasteAreaBtn.onclick = () => {
    pasteAreaContainer.style.display = 'none';
  };

  // 붙여넣기 데이터 파싱 (탭/쉼표/줄바꿈)
  function parsePastedTable(text) {
    const lines = text.trim().split(/\r?\n/);
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(new RegExp(delimiter));
    return lines.slice(1).map(line => {
      const values = line.split(new RegExp(delimiter));
      const obj = {};
      headers.forEach((h, i) => obj[h.trim()] = values[i] ? values[i].trim() : undefined);
      return obj;
    });
  }
  addPastedTableBtn.onclick = () => {
    const text = pasteArea.value.trim();
    if (!text) return alert('붙여넣을 데이터를 입력하세요.');
    let data;
    try {
      data = parsePastedTable(text);
    } catch (e) {
      return alert('붙여넣기 데이터 파싱 오류: ' + e.message);
    }
    mergedTable = data;
    renderMergedTable();
    pasteAreaContainer.style.display = 'none';
  };

  // 초기 렌더
  renderTable(tableContainer1, table1, []);
  renderTable(tableContainer2, table2, []);
  renderMergedTable();
}); 