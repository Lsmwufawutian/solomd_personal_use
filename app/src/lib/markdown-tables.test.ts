/**
 * Unit tests for malformed GFM table-delimiter normalization.
 *
 * The repo has no vitest/tsx dependency, so this uses Node's built-in
 * `node:test` + `node:assert` and Node 23+ native TypeScript type-stripping.
 * Run from the worktree root with:
 *
 *   node --test --experimental-strip-types \
 *     app/src/lib/markdown-tables.selftest.mjs
 *
 * (the `.selftest.mjs` wrapper resolves markdown.ts's extension-less / plugin
 * imports the same way relationships.selftest.mjs does).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { renderMarkdown, preprocessMarkdown } from './markdown.ts';

// The render pipeline tags block elements with `data-source-line`, so <table>
// carries attributes — match the tag open, not a bare `<table>`.
const countTables = (html: string): number =>
  (html.match(/<table[\s>]/g) || []).length;

test('分隔行比表头多一列 — 用户上报的文档', () => {
  const src = `| 大类 | 领域 | 管制编码范围 |
|:----:|------|:-----------:|----------|
| 1 | 专用材料 | 1A-1E |
| 2 | 材料加工 | 2A-2E |`;
  const html = renderMarkdown(src);
  assert.equal(countTables(html), 1, '应被识别为 1 个表格');
  assert.match(html, /<th[^>]*>大类<\/th>/);
  // 首列的 `:----:` 对齐意图应保留
  assert.match(html, /<th style="text-align:center">大类<\/th>/);
});

test('分隔行比表头少一列', () => {
  const src = `| A | B | C |
|---|---|
| 1 | 2 | 3 |`;
  assert.equal(countTables(renderMarkdown(src)), 1);
});

test('列数正确的正常表格不被改动', () => {
  const src = `| A | B |
|:--|--:|
| 1 | 2 |`;
  assert.equal(preprocessMarkdown(src).replace(/\n$/, ''), src);
  assert.equal(countTables(renderMarkdown(src)), 1);
});

test('代码块内的伪表格保持原样', () => {
  const src = '```\n| A | B |\n|---|---|---|\n```';
  assert.equal(countTables(renderMarkdown(src)), 0);
  assert.match(preprocessMarkdown(src), /\|---\|---\|---\|/);
});

test('普通 HR 分隔线不被误判为表格分隔行', () => {
  const src = `文字\n\n---\n\n更多文字`;
  assert.equal(countTables(renderMarkdown(src)), 0);
});

test('含转义管道的单元格', () => {
  const src = `| A | B |\n|---|---|---|\n| a\\|b | c |`;
  assert.equal(countTables(renderMarkdown(src)), 1);
});

test('分隔行含空单元格', () => {
  const src = `| A | B | C |\n| --- |  | --- |\n| 1 | 2 | 3 |`;
  assert.equal(countTables(renderMarkdown(src)), 1);
});

test('全空的第二行不被误判为分隔行(仍是普通段落)', () => {
  const src = `| A | B |\n|  |  |\n| 1 | 2 |`;
  assert.equal(countTables(renderMarkdown(src)), 0);
});

test('一份文档中的多个畸形表格都被修复', () => {
  const src = `| 大类 | 领域 | 管制编码范围 |
|:----:|------|:-----------:|----------|
| 1 | 专用材料 | 1A-1E |

| 子章节 | 内容 |
|:------:|------|----------|
| （一） | 核材料 |`;
  assert.equal(countTables(renderMarkdown(src)), 2);
});
