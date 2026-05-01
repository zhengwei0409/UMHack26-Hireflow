import { Request, Response } from 'express';
import { getBiasMetrics as getMetrics, getRecentBiasSnapshots, simulateThresholdChange, getAIBiasExplanation } from '../services/bias-audit.service';

export async function getBiasMetrics(req: Request, res: Response) {
  try {
    const { jobId } = req.query;
    const metrics = await getMetrics(jobId as string | undefined);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get bias metrics';
    res.status(400).json({ success: false, error: message });
  }
}

export async function getRecentSnapshots(req: Request, res: Response) {
  try {
    const { jobId, limit } = req.query;
    const snapshots = await getRecentBiasSnapshots(
      jobId as string | undefined,
      limit ? parseInt(limit as string, 10) : 50
    );

    res.json({
      success: true,
      data: snapshots,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get snapshots';
    res.status(400).json({ success: false, error: message });
  }
}

export async function getSnapshotsForCandidate(req: Request, res: Response) {
  try {
    const { candidateId } = req.params;

    res.json({
      success: true,
      data: [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get candidate snapshots';
    res.status(400).json({ success: false, error: message });
  }
}

export async function runThresholdSimulation(req: Request, res: Response) {
  try {
    const { threshold, jobId } = req.body;

    if (!threshold || isNaN(Number(threshold))) {
      return res.status(400).json({ success: false, error: 'Valid threshold is required' });
    }

    const result = await simulateThresholdChange(Number(threshold), jobId as string | undefined);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run simulation';
    res.status(400).json({ success: false, error: message });
  }
}

export async function getAIBiasAnalysis(req: Request, res: Response) {
  try {
    const { jobId } = req.query;
    const result = await getAIBiasExplanation(jobId as string | undefined);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get AI analysis';
    res.status(400).json({ success: false, error: message });
  }
}