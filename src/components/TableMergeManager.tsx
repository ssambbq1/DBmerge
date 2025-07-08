import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as XLSX from 'xlsx';

interface TableRow {
  [key: string]: string | number | undefined;
}

function parseCSV(text: string): TableRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const lowerHeaders = headers.map(h => h.toLowerCase());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj: TableRow = {};
    lowerHeaders.forEach((h, i) => (obj[h] = values[i]));
    return obj;
  });
}

function toCSV(data: TableRow[], columns: string[]): string {
  const header = columns.join(',');
  const rows = data.map(row => columns.map(col => row[col.toLowerCase()] ?? '').join(','));
  return [header, ...rows].join('\n');
}

function getAllColumns(...tables: TableRow[][]): string[] {
  const set = new Set<string>();
  tables.forEach(table => table.forEach(row => Object.keys(row).forEach(col => set.add(col.toLowerCase()))));
  return Array.from(set);
}

function parsePastedTable(text: string): TableRow[] {
  // Try JSON first
  try {
    if (text.trim().startsWith('[')) {
      // JSON의 경우, 컬럼명도 소문자로 변환
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
  // Otherwise, treat as tabular (Excel/CSV)
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(/\t|,/).map(h => h.trim());
  const lowerHeaders = headers.map(h => h.toLowerCase());
  return lines.slice(1).map(line => {
    const values = line.split(/\t|,/);
    const obj: TableRow = {};
    lowerHeaders.forEach((h, i) => (obj[h] = values[i]));
    return obj;
  });
}

const TableMergeManager: React.FC = () => {
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

  // 인라인 에디팅 상태: {tableType, rowIdx, col} (tableType: 'table1' | 'table2' | 'merged')
  const [editingCell, setEditingCell] = useState<{ table: string; rowIdx: number; col: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  // 헤더 인라인 에디팅 상태: {table, col, colIdx}
  const [editingHeader, setEditingHeader] = useState<{ table: string; col: string; colIdx: number } | null>(null);
  const [editingHeaderValue, setEditingHeaderValue] = useState<string>('');

  // 셀 값 변경 핸들러
  const handleCellChange = (table: string, rowIdx: number, col: string, value: string) => {
    if (table === 'table1') {
      setTable1(prev => {
        const next = [...prev];
        next[rowIdx] = { ...next[rowIdx], [col]: value };
        return next;
      });
    } else if (table === 'table2') {
      setTable2(prev => {
        const next = [...prev];
        next[rowIdx] = { ...next[rowIdx], [col]: value };
        return next;
      });
    } else if (table === 'merged') {
      setMergedTable(prev => {
        const next = [...prev];
        next[rowIdx] = { ...next[rowIdx], [col]: value };
        return next;
      });
    }
  };

  // 헤더 값 변경 핸들러
  const handleHeaderChange = (table: string, oldCol: string, newCol: string) => {
    if (!newCol || oldCol === newCol) return;
    if (table === 'table1') {
      setTable1(prev => prev.map(row => {
        const newRow: TableRow = {};
        Object.keys(row).forEach(k => {
          if (k === oldCol) {
            newRow[newCol] = row[k];
          } else {
            newRow[k] = row[k];
          }
        });
        return newRow;
      }));
    } else if (table === 'table2') {
      setTable2(prev => prev.map(row => {
        const newRow: TableRow = {};
        Object.keys(row).forEach(k => {
          if (k === oldCol) {
            newRow[newCol] = row[k];
          } else {
            newRow[k] = row[k];
          }
        });
        return newRow;
      }));
    } else if (table === 'merged') {
      setMergedTable(prev => prev.map(row => {
        const newRow: TableRow = {};
        Object.keys(row).forEach(k => {
          if (k === oldCol) {
            newRow[newCol] = row[k];
          } else {
            newRow[k] = row[k];
          }
        });
        return newRow;
      }));
    }
  };

  useEffect(() => {
    if (table2.length > 0) {
      const firstRow = table2[0];
      const firstCol = firstRow && Object.keys(firstRow)[0];
      if (firstCol && mergeKey.toLowerCase() !== firstCol.toLowerCase()) {
        setMergeKey(firstCol);
      }
    }
  }, [table2]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, setTable: (t: TableRow[]) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      let data: TableRow[] = [];
      try {
        if (file.name.endsWith('.json')) {
          // JSON의 경우, 컬럼명도 소문자로 변환
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
          // XLSX의 경우, 컬럼명도 소문자로 변환
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

  const handlePaste = (text: string, setTable: (t: TableRow[]) => void) => {
    try {
      const data = parsePastedTable(text);
      setTable(data);
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

  const renderTable = (
    data: TableRow[],
    columns?: string[],
    highlightDiffs?: boolean,
    tableType?: 'table1' | 'table2' | 'merged'
  ) => {
    if (!data || data.length === 0) return <p className="text-center text-muted-foreground py-4">데이터가 없습니다.</p>;
    const cols = (columns || getAllColumns(data)).map(c => c.toLowerCase());
    return (
      <div className="overflow-x-auto rounded-lg border bg-background max-h-[600px] overflow-y-auto">
        <table className="min-w-0 table-auto text-sm">
          <thead>
            <tr>
              {cols.map((col, idx) => {
                const isEditingHeader =
                  editingHeader &&
                  editingHeader.table === tableType &&
                  editingHeader.colIdx === idx;
                return (
                  <th
                    key={col}
                    className={
                      `border-b bg-muted px-3 py-2 font-semibold text-left text-foreground whitespace-nowrap` +
                      (idx !== cols.length - 1 ? ' border-r' : '')
                    }
                    onClick={e => {
                      e.stopPropagation();
                      if (!isEditingHeader && tableType) {
                        setEditingHeader({ table: tableType, col, colIdx: idx });
                        setEditingHeaderValue(col);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {isEditingHeader ? (
                      <input
                        className="bg-yellow-50 border rounded px-1 py-0.5 text-sm"
                        value={editingHeaderValue}
                        autoFocus
                        placeholder="헤더명"
                        size={Math.max(6, editingHeaderValue.length + 2)}
                        style={{ minWidth: 60, maxWidth: 300 }}
                        onChange={e => setEditingHeaderValue(e.target.value)}
                        onBlur={() => {
                          handleHeaderChange(tableType!, col, editingHeaderValue.toLowerCase());
                          setEditingHeader(null);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            handleHeaderChange(tableType!, col, editingHeaderValue.toLowerCase());
                            setEditingHeader(null);
                          } else if (e.key === 'Escape') {
                            setEditingHeader(null);
                          }
                        }}
                      />
                    ) : (
                      col
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="even:bg-muted/50">
                {cols.map((col, idx) => {
                  let cellClass = "px-3 py-2 border-b whitespace-nowrap" + (idx !== cols.length - 1 ? ' border-r' : '');
                  let cellValue = row[col];
                  if (highlightDiffs && mergeKey && table1.length > 0 && table2.length > 0) {
                    const key = mergeKey.toLowerCase();
                    const row1 = table1.find(r => r[key] === row[key]);
                    const row2 = table2.find(r => r[key] === row[key]);
                    if (!row1 && row2) {
                      // 완전히 새로 추가된 row: 모든 셀 초록색
                      cellClass += " bg-green-200";
                    } else if (row1 && row2) {
                      // 기존 row에서 새로 추가된 컬럼
                      if (row1[col] === undefined && row2[col] !== undefined) {
                        cellClass += " bg-green-200";
                      } else if (
                        row1[col] !== undefined &&
                        row2[col] !== undefined &&
                        row2[col] !== null &&
                        row2[col] !== '' &&
                        row1[col] !== row2[col]
                      ) {
                        // 기존 값이 바뀐 경우 (단, Additional Table의 값이 비어있지 않을 때만)
                        cellClass += " bg-yellow-200";
                      }
                    }
                  }
                  // 인라인 에디팅 렌더링
                  const isEditing =
                    editingCell &&
                    editingCell.table === tableType &&
                    editingCell.rowIdx === i &&
                    editingCell.col === col;
                  return (
                    <td
                      key={col}
                      className={cellClass + ' cursor-pointer'}
                      onClick={() => {
                        if (!isEditing && tableType) {
                          setEditingCell({ table: tableType, rowIdx: i, col });
                          setEditingValue(String(cellValue ?? ''));
                        }
                      }}
                    >
                      {isEditing ? (
                        <input
                          className="w-full bg-yellow-50 border rounded px-1 py-0.5 text-sm"
                          value={editingValue}
                          autoFocus
                          placeholder="값 입력"
                          onChange={e => setEditingValue(e.target.value)}
                          onBlur={() => {
                            handleCellChange(tableType!, i, col, editingValue);
                            setEditingCell(null);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              handleCellChange(tableType!, i, col, editingValue);
                              setEditingCell(null);
                            } else if (e.key === 'Escape') {
                              setEditingCell(null);
                            }
                          }}
                        />
                      ) : (
                        cellValue
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="max-w-10xl mx-auto py-4 space-y-2 bg-gray-300 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-6 font-handdrawn">DB Merge Manager</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Table 1 */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="font-gothictitle">Main Table</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-row gap-2">
              <Input id="fileInput1" type="file" accept=".json,.csv,.xlsx" ref={fileInput1} onChange={e => handleFile(e, setTable1)} className="w-3/5 bg-gray-400" />
              <Button variant="default" type="button" onClick={() => setShowPaste1(v => !v)} className="w-25">Table Paste</Button>
            </div>
            {showPaste1 && (
              <div className="flex flex-col gap-2 bg-muted rounded-lg p-3">
 
                <textarea id="pasteText1" className="resize-none rounded-md border p-2 text-sm bg-background" rows={4} value={pasteText1} onChange={e => setPasteText1(e.target.value)} placeholder="엑셀 등에서 복사한 표를 Ctrl+V로 붙여넣으세요" />
                <div className="flex gap-2 justify-end">
                  <Button variant="default" type="button" onClick={() => { handlePaste(pasteText1, setTable1); setShowPaste1(false); }}>적용</Button>
                  <Button variant="outline" type="button" onClick={() => setShowPaste1(false)}>닫기</Button>
                </div>
              </div>
            )}
            <div className="pt-2">{renderTable(table1, undefined, false, 'table1')}</div>
          </CardContent>
        </Card>
        {/* Table 2 */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="font-gothictitle">Additional Table</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-row gap-2">
              <Input id="fileInput2" type="file" accept=".json,.csv,.xlsx" ref={fileInput2} onChange={e => handleFile(e, setTable2)} className="w-3/5 bg-gray-400" />
              <Button variant="default" type="button" onClick={() => setShowPaste2(v => !v)} className="w-25">Table Paste</Button>
            </div>
            {showPaste2 && (
              <div className="flex flex-col gap-2 bg-muted rounded-lg p-3">
            
                <textarea id="pasteText2" className="resize-none rounded-md border p-2 text-sm bg-background" rows={4} value={pasteText2} onChange={e => setPasteText2(e.target.value)} placeholder="엑셀 등에서 복사한 표를 Ctrl+V로 붙여넣으세요" />
                <div className="flex gap-2 justify-end">
                  <Button variant="default" type="button" onClick={() => { handlePaste(pasteText2, setTable2); setShowPaste2(false); }}>적용</Button>
                  <Button variant="outline" type="button" onClick={() => setShowPaste2(false)}>닫기</Button>
                </div>
              </div>
            )}
            <div className="pt-2">{renderTable(table2, undefined, false, 'table2')}</div>
          </CardContent>
        </Card>
      </div>
      {/* Merge Section */}
      <Card>
        <CardHeader>
          <CardTitle className="font-gothictitle">Merged Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="mergeKey">병합 기준 컬럼</Label>
              <Input id="mergeKey" type="text" value={mergeKey} onChange={e => setMergeKey(e.target.value)} placeholder="예: id" className="w-32" />
            </div>
            <div className="flex flex-row flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="default"
                onClick={handleMerge}
                className="min-w-[64px] max-w-[100px] px-2"
              >
                병합
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMergedTable([])}
                className="min-w-[64px] max-w-[100px] px-2"
              >
                초기화
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleExport('json')}
                className="min-w-[64px] max-w-[100px] px-2"
              >
                JSON 저장
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleExport('csv')}
                className="min-w-[64px] max-w-[100px] px-2"
              >
                CSV 저장
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleExportExcel}
                className="min-w-[64px] max-w-[100px] px-2"
              >
                엑셀저장
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start">
          {/* Legend for revised/added marks - only show if mergedTable is not empty */}
          {mergedTable.length > 0 && (
            <div className="flex gap-4 mb-2">
              <div className="flex items-center gap-1">
                <span className="inline-block w-4 h-4 rounded bg-yellow-200 border border-yellow-400"></span>
                <span className="text-sm text-gray-700">Revised: 노란색</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-4 h-4 rounded bg-green-200 border border-green-400"></span>
                <span className="text-sm text-gray-700">Added: 녹색</span>
              </div>
            </div>
          )}
          <div className="w-full">{renderTable(mergedTable, undefined, true, 'merged')}</div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TableMergeManager; 