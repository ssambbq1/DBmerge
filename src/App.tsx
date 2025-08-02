import React, { useState, useRef, useEffect } from 'react';
import TableMergeManager from './components/TableMergeManager';
import TableLoader from './components/TableLoader';
import Tabs from './components/ui/Tabs';
import * as XLSX from 'xlsx';

// TableRow type for TableLoader
interface TableRow {
  [key: string]: string | number | undefined;
}

function parseCSV(text: string): TableRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const lowerHeaders = headers.map(h => h.toLowerCase());
  const convertValue = (value: string): string | number => {
    const trimmed = value.trim();
    if (trimmed === '') return '';
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== '') {
      return num;
    }
    return trimmed;
  };
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj: TableRow = {};
    lowerHeaders.forEach((h, i) => {
      obj[h] = convertValue(values[i] || '');
    });
    return obj;
  });
}

function toCSV(data: TableRow[], columns: string[]): string {
  const header = columns.join(',');
  const rows = data.map(row => columns.map(col => row[col.toLowerCase()] ?? '').join(','));
  return [header, ...rows].join('\n');
}

function getAllColumns(table: TableRow[]): string[] {
  const set = new Set<string>();
  table.forEach(row => Object.keys(row).forEach(col => set.add(col.toLowerCase())));
  return Array.from(set);
}

function parsePastedTable(text: string): TableRow[] {
  try {
    if (text.trim().startsWith('[')) {
      const arr = JSON.parse(text) as TableRow[];
      return arr.map((row) => {
        const newRow: TableRow = {};
        Object.keys(row).forEach(k => {
          newRow[k.toLowerCase()] = row[k];
        });
        return newRow;
      });
    }
  } catch {}
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(/\t|,/).map(h => h.trim());
  const lowerHeaders = headers.map(h => h.toLowerCase());
  const convertValue = (value: string): string | number => {
    const trimmed = value.trim();
    if (trimmed === '') return '';
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== '') {
      return num;
    }
    return trimmed;
  };
  return lines.slice(1).map(line => {
    const values = line.split(/\t|,/);
    const obj: TableRow = {};
    lowerHeaders.forEach((h, i) => {
      obj[h] = convertValue(values[i] || '');
    });
    return obj;
  });
}

function App() {
  const [tab, setTab] = useState('merge');
  
  // TableLoader state
  const [table, setTable] = useState<TableRow[]>([]);
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>([]);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  // TableMergeManager state
  const [table1, setTable1] = useState<TableRow[]>([]);
  const [table2, setTable2] = useState<TableRow[]>([]);
  const [mergedTable, setMergedTable] = useState<TableRow[]>([]);
  const [mergeKey, setMergeKey] = useState('');
  const [showPaste1, setShowPaste1] = useState(false);
  const [showPaste2, setShowPaste2] = useState(false);
  const [pasteText1, setPasteText1] = useState('');
  const [pasteText2, setPasteText2] = useState('');
  const fileInput1 = useRef<HTMLInputElement>(null);
  const fileInput2 = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedTableLoader = localStorage.getItem('tableLoaderState');
    if (savedTableLoader) {
      try {
        const parsed = JSON.parse(savedTableLoader);
        setTable(parsed.table || []);
        setSelectedHeaders(parsed.selectedHeaders || []);
        setShowPaste(parsed.showPaste || false);
        setPasteText(parsed.pasteText || '');
      } catch {}
    }

    const savedTableMerge = localStorage.getItem('tableMergeState');
    if (savedTableMerge) {
      try {
        const parsed = JSON.parse(savedTableMerge);
        setTable1(parsed.table1 || []);
        setTable2(parsed.table2 || []);
        setMergedTable(parsed.mergedTable || []);
        setMergeKey(parsed.mergeKey || '');
        setShowPaste1(parsed.showPaste1 || false);
        setShowPaste2(parsed.showPaste2 || false);
        setPasteText1(parsed.pasteText1 || '');
        setPasteText2(parsed.pasteText2 || '');
      } catch {}
    }
  }, []);

  // Save TableLoader state to localStorage on state change
  useEffect(() => {
    localStorage.setItem('tableLoaderState', JSON.stringify({
      table,
      selectedHeaders,
      showPaste,
      pasteText,
    }));
  }, [table, selectedHeaders, showPaste, pasteText]);

  // Save TableMergeManager state to localStorage on state change
  useEffect(() => {
    localStorage.setItem('tableMergeState', JSON.stringify({
      table1,
      table2,
      mergedTable,
      mergeKey,
      showPaste1,
      showPaste2,
      pasteText1,
      pasteText2,
    }));
  }, [table1, table2, mergedTable, mergeKey, showPaste1, showPaste2, pasteText1, pasteText2]);

  // TableLoader handlers
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      let data: TableRow[] = [];
      try {
        if (file.name.endsWith('.json')) {
          const arr = JSON.parse(ev.target?.result as string) as TableRow[];
          data = arr.map((row) => {
            const newRow: TableRow = {};
            Object.keys(row).forEach(k => {
              newRow[k.toLowerCase()] = row[k];
            });
            return newRow;
          });
        } else if (file.name.endsWith('.csv')) {
          data = parseCSV(ev.target?.result as string);
        } else if (file.name.endsWith('.xlsx')) {
          const arr = new Uint8Array(ev.target?.result as ArrayBuffer);
          const workbook = XLSX.read(arr, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as TableRow[];
          data = raw.map((row) => {
            const newRow: TableRow = {};
            Object.keys(row).forEach(k => {
              newRow[k.toLowerCase()] = row[k];
            });
            return newRow;
          });
        } else {
          alert('지원하지 않는 파일 형식입니다.');
        }
        setTable(data);
        setSelectedHeaders(getAllColumns(data));
      } catch (e) {
        alert('파일 파싱 오류: ' + (e as Error).message);
      }
    };
    if (file.name.endsWith('.xlsx')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handlePaste = () => {
    try {
      const data = parsePastedTable(pasteText);
      setTable(data);
      setSelectedHeaders(getAllColumns(data));
      setShowPaste(false);
      setPasteText('');
    } catch (e) {
      alert('붙여넣기 데이터 파싱 오류: ' + (e as Error).message);
    }
  };

  const handleHeaderToggle = (header: string) => {
    setSelectedHeaders(prev =>
      prev.includes(header)
        ? prev.filter(h => h !== header)
        : [...prev, header]
    );
  };

  // TableMergeManager handlers
  const handleFile1 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      let data: TableRow[] = [];
      try {
        if (file.name.endsWith('.json')) {
          const arr = JSON.parse(ev.target?.result as string) as TableRow[];
          data = arr.map((row) => {
            const newRow: TableRow = {};
            Object.keys(row).forEach(k => {
              newRow[k.toLowerCase()] = row[k];
            });
            return newRow;
          });
        } else if (file.name.endsWith('.csv')) {
          data = parseCSV(ev.target?.result as string);
        } else if (file.name.endsWith('.xlsx')) {
          const arr = new Uint8Array(ev.target?.result as ArrayBuffer);
          const workbook = XLSX.read(arr, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as TableRow[];
          data = raw.map((row) => {
            const newRow: TableRow = {};
            Object.keys(row).forEach(k => {
              newRow[k.toLowerCase()] = row[k];
            });
            return newRow;
          });
        } else {
          alert('지원하지 않는 파일 형식입니다.');
        }
        setTable1(data);
      } catch (e) {
        alert('파일 파싱 오류: ' + (e as Error).message);
      }
    };
    if (file.name.endsWith('.xlsx')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleFile2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      let data: TableRow[] = [];
      try {
        if (file.name.endsWith('.json')) {
          const arr = JSON.parse(ev.target?.result as string) as TableRow[];
          data = arr.map((row) => {
            const newRow: TableRow = {};
            Object.keys(row).forEach(k => {
              newRow[k.toLowerCase()] = row[k];
            });
            return newRow;
          });
        } else if (file.name.endsWith('.csv')) {
          data = parseCSV(ev.target?.result as string);
        } else if (file.name.endsWith('.xlsx')) {
          const arr = new Uint8Array(ev.target?.result as ArrayBuffer);
          const workbook = XLSX.read(arr, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as TableRow[];
          data = raw.map((row) => {
            const newRow: TableRow = {};
            Object.keys(row).forEach(k => {
              newRow[k.toLowerCase()] = row[k];
            });
            return newRow;
          });
        } else {
          alert('지원하지 않는 파일 형식입니다.');
        }
        setTable2(data);
      } catch (e) {
        alert('파일 파싱 오류: ' + (e as Error).message);
      }
    };
    if (file.name.endsWith('.xlsx')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handlePaste1 = () => {
    try {
      const data = parsePastedTable(pasteText1);
      setTable1(data);
      setShowPaste1(false);
      setPasteText1('');
    } catch (e) {
      alert('붙여넣기 데이터 파싱 오류: ' + (e as Error).message);
    }
  };

  const handlePaste2 = () => {
    try {
      const data = parsePastedTable(pasteText2);
      setTable2(data);
      setShowPaste2(false);
      setPasteText2('');
    } catch (e) {
      alert('붙여넣기 데이터 파싱 오류: ' + (e as Error).message);
    }
  };

  const handleMerge = () => {
    if (!mergeKey) return alert('병합 기준 컬럼을 입력하세요.');
    if (table1.length === 0 || table2.length === 0) return alert('두 테이블 모두 데이터가 필요합니다.');
    const merged: TableRow[] = [];
    const key = mergeKey.toLowerCase();
    const table2Map = new Map(table2.map(row => [row[key], row]));
    const usedKeys = new Set();
    // 1. table1 기준 병합
    table1.forEach(row1 => {
      const row2 = table2Map.get(row1[key]);
      if (row2) {
        const mergedRow: TableRow = { ...row1 };
        Object.keys(row2).forEach(col => {
          // row2의 값이 null/undefined/''가 아니면 덮어씀
          if (row2[col] !== undefined && row2[col] !== null && row2[col] !== '') {
            mergedRow[col] = row2[col];
          }
        });
        merged.push(mergedRow);
        usedKeys.add(row1[key]);
      } else {
        merged.push({ ...row1 });
      }
    });
    // 2. table2에만 있는 row 추가
    table2.forEach(row2 => {
      if (!usedKeys.has(row2[key])) {
        merged.push({ ...row2 });
      }
    });
    setMergedTable(merged);
  };

  const handleExport = (type: 'json' | 'csv') => {
    if (mergedTable.length === 0) return alert('병합 결과가 없습니다.');
    const columns = getAllColumns(mergedTable);
    let content = '';
    let filename = '';
    if (type === 'json') {
      content = JSON.stringify(mergedTable, null, 2);
      filename = 'merged.json';
    } else {
      content = toCSV(mergedTable, columns);
      filename = 'merged.csv';
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    if (mergedTable.length === 0) return alert('병합 결과가 없습니다.');
    const ws = XLSX.utils.json_to_sheet(mergedTable);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Merged');
    XLSX.writeFile(wb, 'merged.xlsx');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Head */}
      <header className="w-full bg-primary text-primary-foreground py-4 shadow-md mb-4">
        <div className="container mx-auto flex items-center justify-between px-4">
          <h1 className="text-2xl font-bold font-gothictitle tracking-tight">DB Editor</h1>
          <span className="text-sm opacity-80">v0.2</span>
        </div>
      </header>
      {/* Tabs */}
      <div className="container mx-auto px-4">
        <Tabs
          tabs={[
            { label: 'DB Merge Manager', value: 'merge' },
            { label: 'Table Loader', value: 'loader' },
          ]}
          value={tab}
          onChange={setTab}
        >
          <div style={{ display: tab === 'merge' ? 'block' : 'none' }}>
            <TableMergeManager
              table1={table1}
              setTable1={setTable1}
              table2={table2}
              setTable2={setTable2}
              mergedTable={mergedTable}
              setMergedTable={setMergedTable}
              mergeKey={mergeKey}
              setMergeKey={setMergeKey}
              showPaste1={showPaste1}
              setShowPaste1={setShowPaste1}
              showPaste2={showPaste2}
              setShowPaste2={setShowPaste2}
              pasteText1={pasteText1}
              setPasteText1={setPasteText1}
              pasteText2={pasteText2}
              setPasteText2={setPasteText2}
              fileInput1={fileInput1}
              fileInput2={fileInput2}
              handleFile1={handleFile1}
              handleFile2={handleFile2}
              handlePaste1={handlePaste1}
              handlePaste2={handlePaste2}
              handleMerge={handleMerge}
              handleExport={handleExport}
              handleExportExcel={handleExportExcel}
            />
          </div>
          <div style={{ display: tab === 'loader' ? 'block' : 'none' }}>
            <TableLoader
              table={table}
              setTable={setTable}
              selectedHeaders={selectedHeaders}
              setSelectedHeaders={setSelectedHeaders}
              showPaste={showPaste}
              setShowPaste={setShowPaste}
              pasteText={pasteText}
              setPasteText={setPasteText}
              fileInput={fileInput}
              handleFile={handleFile}
              handlePaste={handlePaste}
              handleHeaderToggle={handleHeaderToggle}
            />
          </div>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
