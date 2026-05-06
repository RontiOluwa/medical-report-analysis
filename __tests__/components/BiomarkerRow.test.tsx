// ─── Tests: BiomarkerRow ─────────────────────────────────────────────────────
// Tests that a biomarker row renders its key data, toggles the expanded detail
// panel on click, and displays the correct flag arrows.

import { render, screen, fireEvent } from '@testing-library/react';
import BiomarkerRow from '@/app/components/BiomarkerRow';
import { Biomarker } from '@/lib/types';

// ── Test fixture ──────────────────────────────────────────────────────────────

const mockBiomarker: Biomarker = {
    name: 'LDL Cholesterol',
    category: 'Lipid Panel',
    value: 149,
    unit: 'mg/dL',
    referenceRange: { min: null, max: 116 },
    optimalRange: { min: null, max: 90 },
    status: 'out_of_range',
    optimalStatus: 'out_of_range',
    flag: 'HIGH',
    note: 'Elevated LDL increases cardiovascular risk — consider dietary changes.',
};

const optimalBiomarker: Biomarker = {
    ...mockBiomarker,
    name: 'Triglycerides',
    value: 60,
    referenceRange: { min: null, max: 150 },
    optimalRange: { min: null, max: 80 },
    status: 'optimal',
    optimalStatus: 'optimal',
    flag: null,
};

// BiomarkerRow renders inside a <table><tbody> — wrap in a table to avoid
// React DOM warnings about invalid nesting of <tr> outside a table
function renderRow(biomarker: Biomarker) {
    return render(
        <table><tbody><BiomarkerRow b={biomarker} /></tbody></table>
    );
}

describe('BiomarkerRow', () => {

    // ── Initial render ──────────────────────────────────────────────────────────

    it('renders the biomarker name', () => {
        renderRow(mockBiomarker);
        expect(screen.getByText('LDL Cholesterol')).toBeInTheDocument();
    });

    it('renders the biomarker value', () => {
        renderRow(mockBiomarker);
        expect(screen.getByText('149')).toBeInTheDocument();
    });

    it('renders the unit', () => {
        renderRow(mockBiomarker);
        expect(screen.getByText('mg/dL')).toBeInTheDocument();
    });

    it('renders the lab reference range', () => {
        renderRow(mockBiomarker);
        // Max-only range renders as "< 116"
        expect(screen.getByText('< 116')).toBeInTheDocument();
    });

    // ── Flag indicator ──────────────────────────────────────────────────────────

    it('renders the ↑ arrow for HIGH flag', () => {
        renderRow(mockBiomarker);
        // The flag is rendered as a visual arrow converted from the 'HIGH' string
        expect(screen.getByText('↑')).toBeInTheDocument();
    });

    it('renders the ↓ arrow for LOW flag', () => {
        const lowBiomarker = { ...mockBiomarker, flag: 'LOW' as const };
        renderRow(lowBiomarker);
        expect(screen.getByText('↓')).toBeInTheDocument();
    });

    it('renders no flag arrow when flag is null', () => {
        renderRow(optimalBiomarker);
        expect(screen.queryByText('↑')).not.toBeInTheDocument();
        expect(screen.queryByText('↓')).not.toBeInTheDocument();
    });

    // ── Expand / collapse ───────────────────────────────────────────────────────

    it('does not show the detail panel initially', () => {
        renderRow(mockBiomarker);
        // The clinical note only appears in the expanded detail panel
        expect(screen.queryByText(mockBiomarker.note)).not.toBeInTheDocument();
    });

    it('shows the detail panel when the row is clicked', () => {
        renderRow(mockBiomarker);
        const row = screen.getByText('LDL Cholesterol').closest('tr')!;

        fireEvent.click(row);

        // Clinical note should now be visible in the expanded panel
        expect(screen.getByText(mockBiomarker.note)).toBeInTheDocument();
    });

    it('shows the longevity optimal range in the expanded panel', () => {
        renderRow(mockBiomarker);
        const row = screen.getByText('LDL Cholesterol').closest('tr')!;
        fireEvent.click(row);

        // Optimal range renders as "< 90" in the expanded detail card
        expect(screen.getByText('< 90')).toBeInTheDocument();
    });

    it('hides the detail panel when the row is clicked again', () => {
        renderRow(mockBiomarker);
        const row = screen.getByText('LDL Cholesterol').closest('tr')!;

        // Open then close
        fireEvent.click(row);
        expect(screen.getByText(mockBiomarker.note)).toBeInTheDocument();

        fireEvent.click(row);
        expect(screen.queryByText(mockBiomarker.note)).not.toBeInTheDocument();
    });

    // ── Status badges ───────────────────────────────────────────────────────────

    it('renders the optimal status badge', () => {
        renderRow(mockBiomarker);
        // "Out of Range" appears in the OptimalStatus column (always visible)
        expect(screen.getAllByText('Out of Range').length).toBeGreaterThan(0);
    });
});