// ─── Tests: StatusBadge ───────────────────────────────────────────────────────
// Verifies that the correct label and CSS classes are applied for each status.

import { render, screen } from '@testing-library/react';
import StatusBadge from '@/app/components/StatusBadge';
import { BiomarkerStatus } from '@/lib/types';

describe('StatusBadge', () => {

    // ── Label rendering ─────────────────────────────────────────────────────────

    it('renders "Optimal" label for optimal status', () => {
        render(<StatusBadge status="optimal" />);
        expect(screen.getByText('Optimal')).toBeInTheDocument();
    });

    it('renders "Normal" label for normal status', () => {
        render(<StatusBadge status="normal" />);
        expect(screen.getByText('Normal')).toBeInTheDocument();
    });

    it('renders "Out of Range" label for out_of_range status', () => {
        render(<StatusBadge status="out_of_range" />);
        expect(screen.getByText('Out of Range')).toBeInTheDocument();
    });

    // ── Color classes ───────────────────────────────────────────────────────────

    it('applies green classes for optimal status', () => {
        render(<StatusBadge status="optimal" />);
        const badge = screen.getByText('Optimal').closest('span');
        expect(badge).toHaveClass('bg-green-50');
        expect(badge).toHaveClass('text-green-700');
    });

    it('applies blue classes for normal status', () => {
        render(<StatusBadge status="normal" />);
        const badge = screen.getByText('Normal').closest('span');
        expect(badge).toHaveClass('bg-blue-50');
        expect(badge).toHaveClass('text-blue-700');
    });

    it('applies red classes for out_of_range status', () => {
        render(<StatusBadge status="out_of_range" />);
        const badge = screen.getByText('Out of Range').closest('span');
        expect(badge).toHaveClass('bg-red-50');
        expect(badge).toHaveClass('text-red-700');
    });

    // ── Size variants ───────────────────────────────────────────────────────────

    it('applies smaller text class when small prop is true', () => {
        render(<StatusBadge status="optimal" small />);
        const badge = screen.getByText('Optimal').closest('span');
        expect(badge).toHaveClass('text-[10px]');
    });

    it('applies normal text class when small prop is false', () => {
        render(<StatusBadge status="optimal" small={false} />);
        const badge = screen.getByText('Optimal').closest('span');
        expect(badge).toHaveClass('text-xs');
    });

    // ── All statuses render without crashing ────────────────────────────────────

    const statuses: BiomarkerStatus[] = ['optimal', 'normal', 'out_of_range'];
    statuses.forEach(status => {
        it(`renders without crashing for status: ${status}`, () => {
            expect(() => render(<StatusBadge status={status} />)).not.toThrow();
        });
    });
});