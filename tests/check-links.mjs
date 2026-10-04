import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { extname, join, relative, sep } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const base = process.env.BASE_URL || 'http://localhost:4173';
const baseRoot = new URL(base.endsWith('/') ? base : `${base}/`);
const internalOrigin = baseRoot.origin;
const data = JSON.parse(await readFile(new URL('../data/credentials.json', import.meta.url), 'utf8'));
const badgeData = JSON.parse(await readFile(new URL('../data/badges.json', import.meta.url), 'utf8'));
const learningData = JSON.parse(await readFile(new URL('../data/linkedin-learning.json', import.meta.url), 'utf8'));
const distDirectory = fileURLToPath(new URL('../', import.meta.url));
const internal = new Map();
const external = new Map();
const linkedExternal = new Set();
const results = [];
const contentExpectations = JSON.parse(await readFile(new URL('./link-content-expectations.json', import.meta.url), 'utf8'));
const internalOnly = process.argv.includes('--internal-only');
const httpOnly = process.argv.includes('--http-only');
const match = process.argv.find(arg => arg.startsWith('--match='))?.slice(8);
const selected = entries => match ? entries.filter(entry => entry.url.includes(match)) : entries;
const outputDirectory = new URL('../output/playwright/', import.meta.url);

await mkdir(outputDirectory, { recursive: true });

for (const credential of data.credentials || []) {
  addExternal(credential.credentialUrl, credential.sourceExpected || credential.title, `${credential.title}: credential`);
  if (credential.imageSourceUrl) addExternal(credential.imageSourceUrl, null, `${credential.title}: artwork source`);

  const documentation = credential.documentation;
  if (documentation) {
    if (documentation.url) {
      addExternal(documentation.url, documentationTerms(documentation.title, documentation.expected), `${credential.title}: documentation`);
    } else results.push({ url: credential.id, passed: false, error: `${credential.title}: documentation.url is missing` });
    for (const reference of documentation.references || []) {
      if (reference?.url) addExternal(reference.url, documentationTerms(reference.title, reference.expected), `${credential.title}: documentation reference`);
      else results.push({ url: credential.id, passed: false, error: `${credential.title}: a documentation reference has no URL` });
    }
    if (!documentation.overview) results.push({ url: credential.id, passed: false, error: `${credential.title}: documentation.overview is missing` });
    addInternal(
      new URL(credential.detailPath, baseRoot),
      `${credential.title}: detail page`,
      '',
      [credential.title, documentation.overview].filter(Boolean)
    );
  }
}

for (const collection of data.collections || []) {
  addExternal(collection.url, collection.expected, `${collection.title || collection.id || 'Collection'}: source`);
}

addExternal(badgeData.profileUrl, null, 'Google Skills badge collection: profile');
addInternal(new URL('data/badges.json', baseRoot), 'Google Skills badge data', '', badgeData.badges.flatMap(badge => [badge.profileTitle, badge.documentation?.overview].filter(Boolean)));
for (const badge of badgeData.badges || []) {
  addExternal(badge.earnedUrl, badge.earnedTitle || badge.profileTitle, `${badge.profileTitle}: earned badge`);
  if (badge.courseUrl) addExternal(badge.courseUrl, badge.documentation?.expected, `${badge.profileTitle}: course`);
  if (badge.imageSourceUrl) addExternal(badge.imageSourceUrl, null, `${badge.profileTitle}: artwork source`);
  const documentation = badge.documentation;
  if (documentation?.url) addExternal(documentation.url, documentationTerms(documentation.title, documentation.expected), `${badge.profileTitle}: source description`);
  else results.push({ url: badge.id, passed: false, error: `${badge.profileTitle}: documentation.url is missing` });
  if (documentation?.excerptSourceUrl) addExternal(documentation.excerptSourceUrl, badge.profileTitle, `${badge.profileTitle}: excerpt source`);
  if (!documentation?.overview) results.push({ url: badge.id, passed: false, error: `${badge.profileTitle}: documentation.overview is missing` });
}

addExternal(learningData.folderUrl, ['LinkedIn Learning (certificates, etc)', 'Decision Intelligence'], 'LinkedIn Learning certificates folder');
addInternal(new URL('data/linkedin-learning.json', baseRoot), 'LinkedIn Learning certificate data', '', learningData.certificates.flatMap(certificate => [certificate.title, certificate.documentation.overview]));
for (const certificate of learningData.certificates) {
  addInternal(new URL(certificate.certificatePath, baseRoot), `${certificate.title}: original certificate PDF`, '', [certificate.title, certificate.recipient, certificate.certificateId]);
  addExternal(certificate.courseUrl, certificate.documentation.expected, `${certificate.title}: primary LinkedIn course source`);
  addExternal(certificate.documentation.url, documentationTerms(certificate.documentation.title, certificate.documentation.expected), `${certificate.title}: course context`);
}

try {
  const pages = await findHtmlFiles(distDirectory);
  if (pages.length === 0) throw new Error('No generated HTML files found under dist/.');

  for (const path of pages) {
    const html = await readFile(path, 'utf8');
    const relativePath = relative(distDirectory, path).split(sep).join('/');
    const pageUrl = new URL(relativePath, baseRoot);
    const markup = html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/(<script\b[^>]*>)[\s\S]*?<\/script\s*>/gi, '$1')
      .replace(/(<style\b[^>]*>)[\s\S]*?<\/style\s*>/gi, '$1');

    for (const tag of markup.matchAll(/<[a-z][^>]*>/gi)) {
      for (const match of tag[0].matchAll(/\b(href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
        const attribute = match[1].toLowerCase();
        const value = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '').trim();
        if (/^(mailto:|tel:|data:|javascript:|blob:|about:)/i.test(value)) continue;
        addHtmlDestination(value, `${relativePath}: ${attribute}="${value}"`, pageUrl);
      }
    }
  }
} catch (error) {
  results.push({ url: 'dist/**/*.html', passed: false, error: error.message });
}

for (const url of linkedExternal) {
  if (!external.has(url) && url !== process.env.SITE_URL) {
    results.push({ url, passed: false, error: 'Uncovered external hyperlink.' });
  }
}

async function check(url, expected = null, { readBody = Boolean(expectedTerms(expected).length) } = {}) {
  const terms = expectedTerms(expected);
  const args = [
    '--location', '--silent', '--show-error', '--max-time', '40',
    '--dump-header', '-',
    '--write-out', '\nCHECK_FINAL:%{http_code}|%{url_effective}|%{content_type}',
    '--user-agent', 'Mozilla/5.0 CertificationsLinkCheck/1.0'
  ];
  if (!readBody) args.push('--output', '/dev/null');
  args.push(url);

  let stdout;
  try {
    ({ stdout } = await exec('curl', args, { maxBuffer: 24 * 1024 * 1024 }));
  } catch (error) {
    const partial = String(error.stdout || '');
    const statuses = [...partial.matchAll(/^HTTP\/\S+ (\d+)/gm)].map(match => Number(match[1]));
    throw new Error(statuses.length
      ? `Broken response in redirect chain: ${url}: ${statuses}`
      : `${url}: ${error.message}`);
  }

  const statuses = [...stdout.matchAll(/^HTTP\/\S+ (\d+)/gm)].map(match => Number(match[1]));
  assert.ok(statuses.length && statuses.every(status => status < 400), `Broken response in redirect chain: ${url}: ${statuses}`);
  const final = stdout.match(/CHECK_FINAL:(\d+)\|([^|\n]+)\|([^\n]*)/);
  assert.ok(final, `No final HTTP response was recorded for ${url}`);
  const finalStatus = Number(final[1]);
  assert.ok(finalStatus >= 200 && finalStatus < 300, `${url}: ${finalStatus}`);

  const finalUrl = final[2];
  const contentType = final[3] || '';
  const isPdf = /pdf/i.test(contentType) || isPdfUrl(finalUrl) || isPdfUrl(url);
  let searchable = '';
  if (terms.length) {
    if (isPdf) {
      const pdfText = await getPdfText(url);
      searchable = normalizeText(pdfText);
    } else {
      searchable = normalizeText(visibleText(stdout));
    }
    for (const term of terms) {
      assert.ok(searchable.includes(normalizeText(term)), `Expected page content missing: ${term} at ${url}`);
    }
  }

  return { url, statuses, finalUrl, expected: terms.length ? terms : null, contentType, body: readBody ? stdout : null, passed: true };
}

async function checkInternalTarget(target) {
  const result = await check(target.url, target.terms, { readBody: Boolean(target.terms.length || target.anchors.length) });
  for (const anchor of target.anchors) {
    assert.ok(hasAnchor(result.body || '', anchor.id), `${anchor.source}: missing internal destination #${anchor.id}`);
  }
  const pdf = isPdfUrl(target.url) || /pdf/i.test(result.contentType) ? verifyPdfResponse(target.url) : undefined;
  return {
    url: target.url,
    pdf,
    statuses: result.statuses,
    finalUrl: result.finalUrl,
    expected: target.terms.length ? target.terms : null,
    anchors: target.anchors.map(anchor => anchor.id),
    sources: [...target.sources],
    passed: true
  };
}

async function checkExternalTarget(target) {
  const terms = target.terms;
  const result = await check(target.url, terms, { readBody: Boolean(terms.length && !isPdfUrl(target.url)) });
  if (isPdfUrl(target.url) || /pdf/i.test(result.contentType)) {
    result.pdf = verifyPdfResponse(target.url);
  }
  return {
    ...result,
    body: undefined,
    sources: [...target.sources],
    expected: terms.length ? terms : null
  };
}

async function runSettledBatches(entries, checkTarget, batchSize = 4) {
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map(checkTarget));
    settled.forEach((result, index) => {
      const target = batch[index];
      const url = target.url || target.key;
      results.push(result.status === 'fulfilled'
        ? result.value
        : { url, sources: target.sources ? [...target.sources] : [], expected: target.terms || null, passed: false, error: result.reason?.message || String(result.reason) });
    });
  }
}

function addHtmlDestination(value, source, pageUrl) {
  let url;
  try {
    url = new URL(value, pageUrl);
  } catch (error) {
    results.push({ url: value, source, passed: false, error: `Invalid hyperlink: ${error.message}` });
    return;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.origin === internalOrigin) {
    addInternal(url, source, decodeHash(url.hash));
  } else {
    url.hash = '';
    const key = url.href;
    linkedExternal.add(key);
    if (!external.has(key)) external.set(key, { key, url: key, terms: [], sources: new Set() });
    external.get(key).sources.add(source);
  }
}

function addInternal(url, source, anchor = '', terms = []) {
  const destination = new URL(url.href);
  destination.hash = '';
  const key = destination.href;
  let target = internal.get(key);
  if (!target) {
    target = { key, url: key, terms: [], anchors: [], sources: new Set() };
    internal.set(key, target);
  }
  target.sources.add(source);
  for (const term of terms) if (term && !target.terms.includes(term)) target.terms.push(term);
  if (anchor) target.anchors.push({ id: anchor, source });
}

function addExternal(value, expected, source) {
  if (!value) return;
  let url;
  try {
    url = new URL(value, baseRoot);
  } catch (error) {
    results.push({ url: value, source, passed: false, error: `Invalid source URL: ${error.message}` });
    return;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  url.hash = '';
  const key = url.href;
  let target = external.get(key);
  if (!target) {
    target = { key, url: key, terms: [], sources: new Set() };
    external.set(key, target);
  }
  target.sources.add(source);
  const evidence = Object.hasOwn(contentExpectations, key) ? contentExpectations[key] : expected;
  for (const term of expectedTerms(evidence)) if (!target.terms.includes(term)) target.terms.push(term);
}

function documentationTerms(title, expected) {
  if (expected === null) return null;
  const terms = expectedTerms(expected);
  if (terms.length === 0 && title) terms.push(title);
  return [...new Set(terms)];
}

function expectedTerms(expected) {
  if (expected === null || expected === undefined) return [];
  return (Array.isArray(expected) ? expected : [expected]).filter(term => typeof term === 'string' && term.trim());
}

function normalizeText(value) {
  return String(value).normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
}

function visibleText(markup) {
  return decodeEntities(String(markup)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' '));
}

function decodeEntities(value) {
  return String(value).replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|#39|lt|gt|nbsp);/gi, (match, entity) => {
    const lower = entity.toLowerCase();
    if (lower === 'amp') return '&';
    if (lower === 'quot') return '"';
    if (lower === 'apos' || lower === '#39') return "'";
    if (lower === 'lt') return '<';
    if (lower === 'gt') return '>';
    if (lower === 'nbsp') return ' ';
    const codepoint = lower.startsWith('#x') ? Number.parseInt(lower.slice(2), 16) : Number.parseInt(lower.slice(1), 10);
    try {
      return Number.isFinite(codepoint) ? String.fromCodePoint(codepoint) : match;
    } catch {
      return match;
    }
  });
}

function hasAnchor(markup, expectedId) {
  for (const tag of String(markup).matchAll(/<[a-z][^>]*>/gi)) {
    for (const attribute of tag[0].matchAll(/(?:^|\s)(id|name)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s/>]+))/gi)) {
      const value = decodeEntities(attribute[2] ?? attribute[3] ?? attribute[4] ?? '');
      if (value === expectedId) return true;
    }
  }
  return false;
}

function decodeHash(hash) {
  if (!hash) return '';
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return hash.slice(1);
  }
}

function isPdfUrl(value) {
  try {
    return extname(new URL(value).pathname).toLowerCase() === '.pdf';
  } catch {
    return extname(String(value).split(/[?#]/)[0]).toLowerCase() === '.pdf';
  }
}

async function getPdfText(url) {
  const downloaded = spawnSync('curl', [
    '--location', '--silent', '--show-error', '--max-time', '40',
    '--user-agent', 'Mozilla/5.0 CertificationsLinkCheck/1.0', url
  ], { encoding: null, maxBuffer: 32 * 1024 * 1024 });
  if (downloaded.error) throw new Error(`Could not download PDF for text checking at ${url}: ${downloaded.error.message}`);
  if (downloaded.status !== 0) throw new Error(`PDF download failed at ${url}: ${downloaded.stderr?.toString() || `exit ${downloaded.status}`}`);

  let extracted = spawnSync('pdftotext', ['-layout', '-', '-'], {
    input: downloaded.stdout,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    timeout: 30000
  });
  if (extracted.error?.code === 'ENOENT') {
    extracted = spawnSync(process.env.PDF_PYTHON || 'python3', ['-c',
      'import io,sys; from pypdf import PdfReader; reader=PdfReader(io.BytesIO(sys.stdin.buffer.read())); print("\\n".join(page.extract_text() or "" for page in reader.pages))'
    ], { input: downloaded.stdout, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 30000 });
  }
  if (extracted.error) throw new Error(`Could not extract PDF text at ${url}: ${extracted.error.message}`);
  if (extracted.status !== 0) throw new Error(`PDF text extraction failed at ${url}: ${extracted.stderr || `exit ${extracted.status}`}. Install Poppler or pypdf (set PDF_PYTHON to its interpreter).`);
  return extracted.stdout || '';
}

function verifyPdfResponse(url) {
  const probe = spawnSync('curl', [
    '--location', '--silent', '--show-error', '--max-time', '40', '--range', '0-1023',
    '--user-agent', 'Mozilla/5.0 CertificationsLinkCheck/1.0',
    '--write-out', '\nCHECK_PDF:%{http_code}|%{content_type}', url
  ], { encoding: null, maxBuffer: 16 * 1024 * 1024 });
  if (probe.error) throw new Error(`Could not inspect PDF response at ${url}: ${probe.error.message}`);
  if (probe.status !== 0) throw new Error(`PDF response inspection failed at ${url}: ${probe.stderr?.toString() || `exit ${probe.status}`}`);

  const output = probe.stdout || Buffer.alloc(0);
  const marker = Buffer.from('\nCHECK_PDF:');
  const markerIndex = output.lastIndexOf(marker);
  assert.ok(markerIndex >= 0, `No PDF response metadata was recorded for ${url}`);
  const metadata = output.subarray(markerIndex + marker.length).toString('utf8');
  const final = metadata.match(/^(\d+)\|([^\n]*)/);
  assert.ok(final, `No final PDF response status was recorded for ${url}`);
  const status = Number(final[1]);
  assert.ok(status >= 200 && status < 300, `${url}: PDF probe returned ${status}`);

  const contentType = final[2] || '';
  const body = output.subarray(0, markerIndex);
  const hasPdfSignature = body.subarray(0, 1024).includes(Buffer.from('%PDF-'));
  assert.ok(hasPdfSignature, `${url}: response did not contain the PDF signature (%PDF-)`);
  assert.ok(!contentType || /pdf|octet-stream/i.test(contentType), `${url}: unexpected PDF content type ${contentType}`);
  return { contentType, hasPdfSignature };
}

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return ['.git', 'node_modules', 'output'].includes(entry.name) ? [] : findHtmlFiles(path);
    return entry.isFile() && extname(entry.name).toLowerCase() === '.html' ? [path] : [];
  }));
  return files.flat().sort();
}

await runSettledBatches(selected([...internal.values()]), checkInternalTarget, 8);

if (internalOnly) {
  console.log('External HTTP checks skipped (--internal-only).');
} else {
  await runSettledBatches(selected([...external.values()]), async target => {
    const result = await checkExternalTarget(target);
    return { ...result, sources: [...target.sources] };
  }, 4);
}

await writeFile(new URL(match ? '../output/playwright/link-results-targeted.json' : '../output/playwright/link-results.json', import.meta.url), JSON.stringify(results, null, 2));
const failed = results.filter(result => !result.passed);
if (failed.length) {
  console.error(`${results.length - failed.length}/${results.length} checks passed. ${failed.length} failed:\n${failed.map(result => `${result.url}: ${result.error}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`PASS: ${results.length} internal/resource and external hyperlink checks; all ${internalOnly ? 0 : selected([...external.values()]).length} external destinations passed their redirect chains and content checks${httpOnly ? ' (HTTP only)' : ''}.`);
}
