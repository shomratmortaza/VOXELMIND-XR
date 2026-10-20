import { describe, expect, it } from 'vitest';
import { emptyReport, formatReport, frameMetrics, pinchValue, planeDimensions, recordFailure } from './xr-capabilities';
describe('Step 1 capability evidence', () => {
 it('never declares a generated report physically verified', () => { const r = emptyReport(); expect(r.deviceVerified).toBe(false); expect(formatReport(r)).toContain('NOT established'); });
 it('distinguishes permission denial from API failure and retains the actual error', () => { const r = recordFailure(emptyReport(),'hit-test',new Error('source failed')); expect(r.features['hit-test']?.status).toBe('error'); expect(r.errors[0]?.message).toBe('Error: source failed'); const denied=recordFailure(r,'immersive-vr',new DOMException('permission refused','NotAllowedError')); expect(denied.features['immersive-vr']?.status).toBe('denied'); expect(denied.errors).toHaveLength(2); });
 it('reports measured rolling averages/minimum, not a target rate', () => { const r = frameMetrics([10,20,30]); expect(r.fpsAverage).toBe(50); expect(r.fpsMinimum).toBeCloseTo(1000/30); expect(r.frameTimeMs).toBe(20); expect(frameMetrics([]).fpsAverage).toBeNull(); expect(frameMetrics(Array(301).fill(10)).sampleCount).toBe(300); });
 it('measures plane dimensions in the two polygon axes including vertical walls', () => { expect(planeDimensions([{x:0,y:0,z:0},{x:4,y:3,z:0}])).toEqual({width:4,depth:3}); });
 it('normalizes raw pinch while treating lost joints as unknown', () => { expect(pinchValue(null)).toBeNull(); expect(pinchValue(0.015)).toBeCloseTo(1); expect(pinchValue(0.06)).toBe(0); });
 it('copies all failures and JSON alongside readable observations', () => { const r=recordFailure(emptyReport(),'anchors',new Error('restore failed')); const text=formatReport(r); expect(text).toContain('FAILURE anchors: Error: restore failed'); expect(JSON.parse(text.split('\nJSON\n')[1] ?? '{}').deviceVerified).toBe(false); });
});
