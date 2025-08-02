import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as XLSX from 'xlsx';

interface TableRow {
  [key: string]: string | number | undefined;
}

function toCSV(data: TableRow[], columns: string[]): string {
  const header = columns.join(',');
  const rows = data.map(row => columns.map(col => row[col.toLowerCase()] ?? '').join(','));
  return [header, ...rows].join('\n');
}

interface TableLoaderProps {
  table: TableRow[];
  setTable: React.Dispatch<React.SetStateAction<TableRow[]>>;
  selectedHeaders: string[];
  setSelectedHeaders: React.Dispatch<React.SetStateAction<string[]>>;
  showPaste: boolean;
  setShowPaste: React.Dispatch<React.SetStateAction<boolean>>;
  pasteText: string;
  setPasteText: React.Dispatch<React.SetStateAction<string>>;
  fileInput: React.RefObject<HTMLInputElement>;
  handleFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePaste: () => void;
  handleHeaderToggle: (header: string) => void;
}

const TableLoader: React.FC<TableLoaderProps> = ({
  table,
  setTable,
  selectedHeaders,
  setSelectedHeaders,
  showPaste,
  setShowPaste,
  pasteText,
  setPasteText,
  fileInput,
  handleFile,
  handlePaste,
  handleHeaderToggle,
}) => {
  const handleExport = (type: 'json' | 'csv') => {
    if (table.length === 0) return alert('데이터가 없습니다.');
    const columns = selectedHeaders;
    let content = '';
    let filename = '';
    if (type === 'json') {
      const filtered = table.map(row => {
        const obj: TableRow = {};
        columns.forEach(col => {
          obj[col] = row[col];
        });
        return obj;
      });
      content = JSON.stringify(filtered, null, 2);
      filename = 'table.json';
    } else {
      content = toCSV(table, columns);
      filename = 'table.csv';
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
    if (table.length === 0) return alert('데이터가 없습니다.');
    const columns = selectedHeaders;
    const filtered = table.map(row => {
      const obj: TableRow = {};
      columns.forEach(col => {
        obj[col] = row[col];
      });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Table');
    XLSX.writeFile(wb, 'table.xlsx');
  };

  const renderTable = (data: TableRow[], columns: string[]) => {
    if (!data || data.length === 0) return <p className="text-center text-muted-foreground py-4">데이터가 없습니다.</p>;
    return (
      <div className="overflow-x-auto rounded-lg border bg-background max-h-[600px] overflow-y-auto">
        <table className="min-w-0 table-auto text-sm">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={col} className={`border-b bg-muted px-3 py-2 font-semibold text-left text-foreground whitespace-nowrap${idx !== columns.length - 1 ? ' border-r' : ''}`}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="even:bg-muted/50">
                {columns.map((col, idx) => (
                  <td key={col} className={`px-3 py-2 border-b whitespace-nowrap${idx !== columns.length - 1 ? ' border-r' : ''}`}>{row[col]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const allHeaders = (() => {
    const set = new Set<string>();
    table.forEach(row => Object.keys(row).forEach(col => set.add(col.toLowerCase())));
    return Array.from(set);
  })();

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-4 bg-gray-100 min-h-[400px]">
      <Card>
        <CardHeader>
          <CardTitle className="font-gothictitle">Table Loader</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-row gap-2 items-center">
            <Input id="fileInput" type="file" accept=".json,.csv,.xlsx" ref={fileInput} onChange={handleFile} className="w-3/5 bg-gray-400" />
            <Button variant="default" type="button" onClick={() => setShowPaste(v => !v)} className="w-25">Table Paste</Button>
            <Button variant="outline" type="button" onClick={() => { setTable([]); setSelectedHeaders([]); if (fileInput.current) fileInput.current.value = ''; }}>초기화</Button>
          </div>
          {showPaste && (
            <div className="flex flex-col gap-2 bg-muted rounded-lg p-3">
              <textarea
                id="pasteText"
                className="resize-none rounded-md border p-2 text-sm bg-background"
                rows={4}
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder="엑셀 등에서 복사한 표를 Ctrl+V로 붙여넣으세요. JSON, CSV, Excel 모두 지원."
              />
              <div className="flex gap-2 justify-end">
                <Button variant="default" type="button" onClick={handlePaste}>적용</Button>
                <Button variant="outline" type="button" onClick={() => setShowPaste(false)}>닫기</Button>
              </div>
            </div>
          )}
          {allHeaders.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <Label className="mr-2">표시할 헤더 선택:</Label>
              {allHeaders.map(header => (
                <label key={header} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedHeaders.includes(header)}
                    onChange={() => handleHeaderToggle(header)}
                    className="accent-primary"
                  />
                  <span className="text-xs font-mono">{header}</span>
                </label>
              ))}
            </div>
          )}
          <div className="pt-2">{renderTable(table, selectedHeaders)}</div>
        </CardContent>
        <CardFooter className="gap-2">
          <Button type="button" variant="secondary" onClick={() => handleExport('json')}>JSON 저장</Button>
          <Button type="button" variant="secondary" onClick={() => handleExport('csv')}>CSV 저장</Button>
          <Button type="button" variant="secondary" onClick={handleExportExcel}>엑셀 저장</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TableLoader; 