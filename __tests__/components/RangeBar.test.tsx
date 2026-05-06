// ─── Tests: RangeBar ─────────────────────────────────────────────────────────
// Tests that the range bar renders when range data is available,
// returns null when no range is defined, and applies the correct dot color.

import { render } from '@testing-library/react';
import RangeBar from '@/app/components/RangeBar';
import { Biomarker } from '@/lib/types';

const baseBiomarker: Biomarker = {
    name: 'LDL Cholesterol',
    category: 'Lipid Panel',
    value: 149,
    unit: 'mg/dL',
    referenceRange: { min: null, max: 116 },
    optimalRange: { min: null, max: 90 },
    status: 'out_of_range',
    optimalStatus: 'out_of_range',
    flag: 'HIGH',
    note: 'Elevated LDL.',
};

describe('RangeBar', () => {

    // ── Renders ─────────────────────────────────────────────────────────────────

    it('renders the track container when a reference range is defined', () => {
        const { container } = render(<RangeBar b={baseBiomarker} />);
        // The track div is the root element of the component
        const track = container.firstChild as HTMLElement;
        expect(track).toBeInTheDocument();
    });

    it('renders three layers: reference bar, optimal bar, and value dot', () => {
        const { container } = render(<RangeBar b={baseBiomarker} />);
        // The component renders one root + three child divs
        const children = container.firstChild?.childNodes;
        expect(children).toHaveLength(3);
    });

    // ── Returns null when no range ──────────────────────────────────────────────

    it('renders nothing when both reference and optimal ranges are null', () => {
        const noRange: Biomarker = {
            ...baseBiomarker,
            referenceRange: { min: null, max: null },
            optimalRange: { min: null, max: null },
        };
        const { container } = render(<RangeBar b={noRange} />);
        // Component should return null — container will be empty
        expect(container.firstChild).toBeNull();
    });

    // ── Dot color by status ─────────────────────────────────────────────────────

    it('applies red dot class when status is out_of_range', () => {
        const { container } = render(<RangeBar b={baseBiomarker} />);
        // The dot is the last child div inside the track
        const dot = container.firstChild?.lastChild as HTMLElement;
        expect(dot.className).toMatch(/bg-red-500/);
    });

    it('applies brand dot class when optimalStatus is optimal', () => {
        const optimal: Biomarker = {
            ...baseBiomarker,
            status: 'optimal',
            optimalStatus: 'optimal',
        };
        const { container } = render(<RangeBar b={optimal} />);
        const dot = container.firstChild?.lastChild as HTMLElement;
        expect(dot.className).toMatch(/bg-brand-500/);
    });

    it('applies blue dot class when status is normal but not optimal', () => {
        const normal: Biomarker = {
            ...baseBiomarker,
            status: 'normal',
            optimalStatus: 'normal',
        };
        const { container } = render(<RangeBar b={normal} />);
        const dot = container.firstChild?.lastChild as HTMLElement;
        expect(dot.className).toMatch(/bg-blue-500/);
    });

    // ── Dot positioning ─────────────────────────────────────────────────────────

    it('positions the dot between 0% and 100%', () => {
        const { container } = render(<RangeBar b={baseBiomarker} />);
        const dot = container.firstChild?.lastChild as HTMLElement;
        const left = parseFloat(dot.style.left);
        // Dot position must be a valid percentage within the visible axis
        expect(left).toBeGreaterThanOrEqual(0);
        expect(left).toBeLessThanOrEqual(100);
    });
});