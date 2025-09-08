import React, { useState, useCallback, useMemo } from 'react';
import { Copy, FileText, AlertCircle, ChevronRight, ChevronDown, Clipboard, Type, Minimize2, Trash2 } from 'lucide-react';

interface JsonNode {
  key: string;
  value: any;
  type: string;
  size: number;
  path: string;
  expanded?: boolean;
}

interface JsonError {
  message: string;
  line: number;
  column: number;
  position: number;
}

function App() {
  const [jsonInput, setJsonInput] = useState('');
  const [parsedJson, setParsedJson] = useState<any>(null);
  const [jsonError, setJsonError] = useState<JsonError | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const calculateSize = useCallback((obj: any): number => {
    return new Blob([JSON.stringify(obj)]).size;
  }, []);

  const parseJsonWithError = useCallback((input: string) => {
    if (!input.trim()) {
      setParsedJson(null);
      setJsonError(null);
      return;
    }

    try {
      const parsed = JSON.parse(input);
      setParsedJson(parsed);
      setJsonError(null);
    } catch (error: any) {
      setParsedJson(null);
      const match = error.message.match(/position (\d+)/);
      const position = match ? parseInt(match[1]) : 0;
      
      const lines = input.substring(0, position).split('\n');
      const line = lines.length;
      const column = lines[lines.length - 1].length + 1;

      setJsonError({
        message: error.message,
        line,
        column,
        position
      });
    }
  }, []);

  const highlightErrorInText = useCallback((text: string, error: JsonError | null) => {
    if (!error || !text) return text;
    
    const position = error.position;
    const before = text.substring(0, position);
    const errorChar = text[position] || '';
    const after = text.substring(position + 1);
    
    return before + '⚠️' + errorChar + after;
  }, []);

  const getFormattedJsonLines = useCallback(() => {
    if (!parsedJson) return [];
    return JSON.stringify(parsedJson, null, 2).split('\n');
  }, [parsedJson]);

  const formattedJsonLines = useMemo(() => getFormattedJsonLines(), [getFormattedJsonLines]);

  const buildJsonTree = useCallback((obj: any, key: string = 'root', path: string = ''): JsonNode[] => {
    const nodes: JsonNode[] = [];
    const currentPath = path ? `${path}.${key}` : key;

    if (obj === null) {
      nodes.push({
        key,
        value: null,
        type: 'null',
        size: calculateSize(null),
        path: currentPath
      });
    } else if (Array.isArray(obj)) {
      const size = calculateSize(obj);
      nodes.push({
        key: key === 'root' ? 'root' : `${key} [${obj.length}]`,
        value: obj,
        type: 'array',
        size,
        path: currentPath,
        expanded: expandedNodes.has(currentPath)
      });

      if (expandedNodes.has(currentPath)) {
        obj.forEach((item, index) => {
          nodes.push(...buildJsonTree(item, `[${index}]`, currentPath));
        });
      }
    } else if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      const size = calculateSize(obj);
      nodes.push({
        key: key === 'root' ? 'root' : `${key} {${keys.length}}`,
        value: obj,
        type: 'object',
        size,
        path: currentPath,
        expanded: expandedNodes.has(currentPath)
      });

      if (expandedNodes.has(currentPath)) {
        keys.forEach(objKey => {
          nodes.push(...buildJsonTree(obj[objKey], objKey, currentPath));
        });
      }
    } else {
      nodes.push({
        key,
        value: obj,
        type: typeof obj,
        size: calculateSize(obj),
        path: currentPath
      });
    }

    return nodes;
  }, [calculateSize, expandedNodes]);

  const jsonTree = useMemo(() => {
    if (!parsedJson) return [];
    return buildJsonTree(parsedJson);
  }, [parsedJson, buildJsonTree]);

  const toggleNode = useCallback((path: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, []);

  const pasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJsonInput(text);
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
    }
  }, []);

  const formatJson = useCallback(() => {
    if (parsedJson) {
      const formatted = JSON.stringify(parsedJson, null, 2);
      setJsonInput(formatted);
    }
  }, [parsedJson]);

  const removeWhitespaces = useCallback(() => {
    if (parsedJson) {
      const minified = JSON.stringify(parsedJson);
      setJsonInput(minified);
    }
  }, [parsedJson]);

  const clearJson = useCallback(() => {
    setJsonInput('');
  }, []);
  const formatBytes = useCallback((bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  React.useEffect(() => {
    parseJsonWithError(jsonInput);
  }, [jsonInput, parseJsonWithError]);

  React.useEffect(() => {
    if (parsedJson && expandedNodes.size === 0) {
      setExpandedNodes(new Set(['root']));
    }
  }, [parsedJson, expandedNodes.size]);

  const JsonNodeComponent = ({ node, depth = 0 }: { node: JsonNode; depth?: number }) => {
    const isExpandable = node.type === 'object' || node.type === 'array';
    const canExpand = isExpandable && node.expanded !== undefined;

    return (
      <div className="relative">
        <div 
          className={`flex items-center gap-2 py-1 px-2 hover:bg-gray-700 rounded cursor-pointer group ${
            depth > 0 ? 'ml-6' : ''
          }`}
          onClick={() => canExpand && toggleNode(node.path)}
        >
          {canExpand && (
            <div className="w-4 h-4 flex items-center justify-center">
              {node.expanded ? (
                <ChevronDown className="w-3 h-3 text-gray-400" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-400" />
              )}
            </div>
          )}
          {!canExpand && <div className="w-4" />}
          
          <span className="text-blue-300 font-mono text-sm">{node.key}</span>
          
          {!isExpandable && (
            <>
              <span className="text-gray-400">:</span>
              <span className={`font-mono text-sm ${
                node.type === 'string' ? 'text-gray-200' :
                node.type === 'number' ? 'text-gray-100' :
                node.type === 'boolean' ? 'text-gray-200' :
                node.type === 'null' ? 'text-gray-500' : 'text-gray-100'
              }`}>
                {node.type === 'string' ? `"${node.value}"` : String(node.value)}
              </span>
            </>
          )}
          
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
              {formatBytes(node.size)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(JSON.stringify(node.value, null, 2));
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
             <Copy className="w-3 h-3 text-gray-500 hover:text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 bg-black">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-gray-300" />
              <div>
                <h1 className="text-xl font-bold">JSON Formatter & Size Analyzer</h1>
              </div>
            </div>
            
            {/* Compact Statistics in Header */}
            {parsedJson && (
              <div className="flex items-center gap-6 bg-black px-4 py-2 rounded-lg border border-gray-600">
                <div className="text-center">
                  <div className="text-white text-sm font-bold">
                    {formatBytes(new Blob([JSON.stringify(parsedJson)]).size)}
                  </div>
                  <div className="text-xs text-gray-400">Size</div>
                </div>
                <div className="text-center">
                  <div className="text-white text-sm font-bold">
                    {JSON.stringify(parsedJson, null, 2).split('\n').length}
                  </div>
                  <div className="text-xs text-gray-400">Lines</div>
                </div>
                <div className="text-center">
                  <div className="text-white text-sm font-bold">
                    {typeof parsedJson === 'object' && parsedJson !== null ? 
                      (Array.isArray(parsedJson) ? parsedJson.length : Object.keys(parsedJson).length) : 
                      1
                    }
                  </div>
                  <div className="text-xs text-gray-400">Items</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="bg-black rounded-lg border border-gray-700">
            <div className="border-b border-gray-700 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">JSON Input</h2>
                  {jsonInput.length > 0 && (
                    <span className="text-xs text-gray-400">
                      ({jsonInput.length} characters)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={pasteFromClipboard}
                    className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                    title="Paste from clipboard"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => copyToClipboard(jsonInput)}
                    className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                    title="Copy JSON"
                    disabled={!jsonInput}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={formatJson}
                    className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                    title="Format JSON"
                    disabled={!parsedJson}
                  >
                    <Type className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={removeWhitespaces}
                    className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                    title="Remove whitespaces"
                    disabled={!parsedJson}
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={clearJson}
                    className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                    title="Clear JSON"
                    disabled={!jsonInput}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="relative h-[calc(100vh-280px)] min-h-[600px]">
              <div className="relative h-full">
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder="Paste your JSON here..."
                  className="w-full h-full px-4 py-4 bg-black text-gray-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-600 border-0 leading-5"
                  spellCheck={false}
                />
                
                {/* Error Position Indicator */}
                {jsonError && (
                  <div className="absolute top-2 right-2 bg-gray-700 text-white px-3 py-1 rounded-lg text-xs flex items-center gap-2 z-10">
                    <AlertCircle className="w-4 h-4 text-gray-300" />
                    Line {jsonError.line}, Column {jsonError.column}
                  </div>
                )}
                
                {/* Error Character Highlight Overlay */}
                {jsonError && jsonInput && (
                  <div className="absolute inset-0 px-4 py-4 pointer-events-none font-mono text-sm leading-5 text-transparent overflow-hidden">
                    <div className="relative">
                      {jsonInput.split('').map((char, index) => (
                        <span
                          key={index}
                          className={`${
                            index === jsonError.position
                              ? 'bg-gray-600 text-white rounded px-0.5'
                              : ''
                          }`}
                          style={{
                            color: index === jsonError.position ? 'white' : 'transparent'
                          }}
                        >
                          {index === jsonError.position ? (char || '⚠') : char}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {jsonError && (
              <div className="border-t border-gray-700 p-4 bg-gray-700 bg-opacity-50">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-200 font-semibold text-sm">JSON Parse Error</p>
                    <p className="text-gray-300 text-sm">{jsonError.message}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Output Panel */}
          <div className="bg-black rounded-lg border border-gray-700">
            <div className="border-b border-gray-700 px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold">JSON Tree & Size Analysis</h2>
              {parsedJson && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(parsedJson, null, 2))}
                    className="p-1 hover:bg-gray-700 rounded"
                    title="Copy formatted JSON"
                  >
                    <Copy className="w-4 h-4 text-gray-400 hover:text-white" />
                  </button>
                </div>
              )}
            </div>

            <div className="h-[calc(100vh-280px)] min-h-[600px] overflow-auto p-2">
              {jsonTree.length > 0 ? (
                <div className="space-y-1">
                  {jsonTree.map((node, index) => (
                    <JsonNodeComponent key={`${node.path}-${index}`} node={node} />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                    <p className="text-lg font-medium">Enter JSON to analyze</p>
                    <p className="text-sm">View structure and size breakdown</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;