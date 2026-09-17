import { describe, expect, it } from 'vitest'

import { getDocumentSourceUrl } from '@lib/documentSourceLinks'

describe('getDocumentSourceUrl', () => {
  it('uses Google Docs for Word document extensions', () => {
    expect(getDocumentSourceUrl('word-file-1', { fileName: 'report.doc' })).toBe(
      'https://docs.google.com/document/d/word-file-1',
    )
    expect(getDocumentSourceUrl('word-file-2', { fileExtension: '.docx' })).toBe(
      'https://docs.google.com/document/d/word-file-2',
    )
  })

  it('uses Google Docs for Word document MIME types', () => {
    expect(
      getDocumentSourceUrl('word-file-3', { mimeType: 'application/msword' }),
    ).toBe('https://docs.google.com/document/d/word-file-3')
    expect(
      getDocumentSourceUrl('word-file-4', {
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    ).toBe('https://docs.google.com/document/d/word-file-4')
  })

  it('uses Google Slides for PowerPoint extensions', () => {
    expect(getDocumentSourceUrl('slides-file-1', { fileName: 'presentation.ppt' })).toBe(
      'https://docs.google.com/presentation/d/slides-file-1',
    )
    expect(getDocumentSourceUrl('slides-file-2', { fileExtension: 'pptx' })).toBe(
      'https://docs.google.com/presentation/d/slides-file-2',
    )
  })

  it('uses Google Slides for PowerPoint MIME types', () => {
    expect(getDocumentSourceUrl('slides-file-3', { mimeType: 'application/vnd.ms-powerpoint' })).toBe(
      'https://docs.google.com/presentation/d/slides-file-3',
    )
    expect(
      getDocumentSourceUrl('slides-file-4', {
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      }),
    ).toBe('https://docs.google.com/presentation/d/slides-file-4')
  })

  it('uses Google Sheets for spreadsheet extensions', () => {
    expect(getDocumentSourceUrl('sheet-file-1', { fileName: 'data.xls' })).toBe(
      'https://docs.google.com/spreadsheets/d/sheet-file-1',
    )
    expect(getDocumentSourceUrl('sheet-file-2', { fileExtension: 'xlsx' })).toBe(
      'https://docs.google.com/spreadsheets/d/sheet-file-2',
    )
  })

  it('uses Google Sheets for spreadsheet MIME types', () => {
    expect(getDocumentSourceUrl('sheet-file-3', { mimeType: 'application/vnd.ms-excel' })).toBe(
      'https://docs.google.com/spreadsheets/d/sheet-file-3',
    )
    expect(
      getDocumentSourceUrl('sheet-file-4', {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    ).toBe('https://docs.google.com/spreadsheets/d/sheet-file-4')
  })

  it('uses the Drive file URL for other file types', () => {
    expect(getDocumentSourceUrl('pdf-file-1', { fileName: 'report.pdf' })).toBe(
      'https://drive.google.com/file/d/pdf-file-1/view',
    )
  })
})
