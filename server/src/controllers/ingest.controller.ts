import { Request, Response, NextFunction } from 'express';
import { IngestionService } from '../services/ingestion.service.js';
import { rawIngestionSchema } from '../validators/ingestion.schema.js';
import pdfParse from 'pdf-parse';
import path from 'path';

export class IngestController {
  static async ingestRaw(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = rawIngestionSchema.parse(req.body);
      const report = await IngestionService.ingest({
        subjectName: parsed.subjectName,
        sourceTitle: parsed.sourceTitle,
        sourceType: parsed.sourceType,
        content: parsed.content,
      });

      res.status(report.isDuplicateSource ? 200 : 201).json({
        success: true,
        report,
      });
    } catch (err) {
      next(err);
    }
  }

  static async ingestFile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }

      const file = req.file;
      const subjectName = req.body.subjectName || 'General Learning';
      const sourceTitle = req.body.sourceTitle || file.originalname;
      const ext = path.extname(file.originalname).toLowerCase();

      let content = '';
      let sourceType: 'notes' | 'pdf' | 'transcript' | 'article' | 'screenshot' | 'code' = 'notes';

      if (ext === '.pdf') {
        sourceType = 'pdf';
        const pdfData = await pdfParse(file.buffer);
        content = pdfData.text;
      } else {
        content = file.buffer.toString('utf-8');
        if (ext === '.md' || ext === '.txt') {
          sourceType = 'notes';
        } else if (['.ts', '.js', '.py', '.go', '.rs', '.java'].includes(ext)) {
          sourceType = 'code';
        }
      }

      if (!content || content.trim().length < 10) {
        res.status(400).json({ success: false, error: 'File contains insufficient or unreadable text' });
        return;
      }

      const report = await IngestionService.ingest({
        subjectName,
        sourceTitle,
        sourceType,
        content,
        fileReference: file.originalname,
      });

      res.status(report.isDuplicateSource ? 200 : 201).json({
        success: true,
        report,
      });
    } catch (err) {
      next(err);
    }
  }
}

