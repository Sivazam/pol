'use client';

import React, { useState, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  total: number;
}

interface DataImportPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DataImportPanel({ open, onOpenChange }: DataImportPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (f: File) => {
    if (!f.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 300);

    try {
      const res = await fetch('/api/import', { method: 'POST', body: formData });
      const data = await res.json();
      clearInterval(interval);
      setProgress(100);
      setResult(data);
    } catch {
      clearInterval(interval);
      setResult({ success: false, imported: 0, skipped: 0, errors: ['Upload failed'], total: 0 });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.open('/api/import', '_blank');
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
  };

  const handleClose = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      handleReset();
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-[420px] sm:max-w-[420px] bg-white dark:bg-[#1E293B] border-l border-slate-200 dark:border-slate-700 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold text-[#0F2B46] dark:text-amber-400 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Data Import
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6 px-4 pb-6">
          {/* Description */}
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Upload a CSV file to bulk-import family data. The file must include columns: <Badge variant="outline" className="text-[10px] mx-0.5 bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300">pdfId</Badge> <Badge variant="outline" className="text-[10px] mx-0.5 bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300">beneficiaryName</Badge> <Badge variant="outline" className="text-[10px] mx-0.5 bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300">villageCode</Badge>
            </p>
          </div>

          {/* Download template */}
          <Button variant="outline" onClick={handleDownloadTemplate} className="w-full gap-2 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800">
            <Download className="w-4 h-4" />
            Download CSV Template
          </Button>

          {/* Drag and drop zone */}
          {!result && (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                dragOver
                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                  : 'border-slate-300 dark:border-slate-600 hover:border-amber-300 dark:hover:border-amber-600'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
              }}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
              <Upload className={`w-10 h-10 mx-auto mb-3 transition-colors ${dragOver ? 'text-amber-500' : 'text-slate-400'}`} />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {file ? file.name : 'Drop CSV file here or click to browse'}
              </p>
              {file && (
                <div className="mt-2 flex items-center justify-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
              )}
              {!file && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Supports .csv files only</p>}
            </div>
          )}

          {/* Upload progress */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">Uploading... {progress}%</p>
            </div>
          )}

          {/* Upload button */}
          {file && !uploading && !result && (
            <div className="flex gap-3">
              <Button onClick={handleUpload} className="flex-1 gap-2 bg-[#0F2B46] hover:bg-[#1E3A5F] text-white">
                <Upload className="w-4 h-4" />
                Upload &amp; Import
              </Button>
              <Button variant="outline" onClick={() => { setFile(null); }} size="icon" className="border-slate-300 dark:border-slate-600">
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${
                result.success
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  {result.success
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    : <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  }
                  <span className={`font-semibold text-sm ${result.success ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                    {result.success ? 'Import Complete' : 'Import Failed'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{result.imported}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Imported</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{result.skipped}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Skipped</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-slate-700 dark:text-slate-300">{result.total}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Total</p>
                  </div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">Errors ({result.errors.length}):</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <p key={i} className="text-[10px] text-red-600 dark:text-red-300">{err}</p>
                    ))}
                  </div>
                </div>
              )}

              <Button variant="outline" onClick={handleReset} className="w-full gap-2 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800">
                Import Another File
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
