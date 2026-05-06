// ─── Tests: UploadZone ───────────────────────────────────────────────────────
// Tests file validation (type and size), the onFile callback, drag state,
// and disabled behavior during loading.

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UploadZone from '@/app/components/UploadZone';

// Helper — creates a File object with the given name, size, and MIME type
function makeFile(name: string, sizeBytes: number, type: string): File {
    const content = new Array(sizeBytes).fill('a').join('');
    return new File([content], name, { type });
}

const validPDF = makeFile('report.pdf', 1024, 'application/pdf');
const largePDF = makeFile('large.pdf', 11 * 1024 * 1024, 'application/pdf'); // 11MB — over limit
const imageFile = makeFile('photo.png', 1024, 'image/png');                  // wrong type

describe('UploadZone', () => {

    // ── Static rendering ────────────────────────────────────────────────────────

    it('renders the drop zone with instructional text', () => {
        render(<UploadZone onFile={jest.fn()} loading={false} />);
        expect(screen.getByText('Drop your lab report here')).toBeInTheDocument();
        expect(screen.getByText(/PDF only/)).toBeInTheDocument();
        expect(screen.getByText('Browse files')).toBeInTheDocument();
    });

    it('renders a hidden file input accepting only PDFs', () => {
        render(<UploadZone onFile={jest.fn()} loading={false} />);
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute('accept', 'application/pdf');
    });

    // ── Valid file selection ────────────────────────────────────────────────────

    it('calls onFile with a valid PDF when selected via the input', async () => {
        const onFile = jest.fn();
        render(<UploadZone onFile={onFile} loading={false} />);

        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        await userEvent.upload(input, validPDF);

        // onFile should be called once with the valid file
        expect(onFile).toHaveBeenCalledTimes(1);
        expect(onFile).toHaveBeenCalledWith(validPDF);
    });

    // ── Validation errors ───────────────────────────────────────────────────────

    it('shows an error and does not call onFile for a non-PDF file', async () => {
        const onFile = jest.fn();
        render(<UploadZone onFile={onFile} loading={false} />);

        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        await userEvent.upload(input, imageFile);

        // Error message should appear
        expect(screen.getByText('Only PDF files are supported.')).toBeInTheDocument();
        // onFile should not be called for an invalid file
        expect(onFile).not.toHaveBeenCalled();
    });

    it('shows an error and does not call onFile for a PDF over 10MB', async () => {
        const onFile = jest.fn();
        render(<UploadZone onFile={onFile} loading={false} />);

        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        await userEvent.upload(input, largePDF);

        expect(screen.getByText('File must be under 10MB.')).toBeInTheDocument();
        expect(onFile).not.toHaveBeenCalled();
    });

    it('clears a previous error when a valid file is selected', async () => {
        const onFile = jest.fn();
        render(<UploadZone onFile={onFile} loading={false} />);
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;

        // First upload an invalid file to trigger an error
        await userEvent.upload(input, imageFile);
        expect(screen.getByText('Only PDF files are supported.')).toBeInTheDocument();

        // Then upload a valid PDF — the error should disappear
        await userEvent.upload(input, validPDF);
        expect(screen.queryByText('Only PDF files are supported.')).not.toBeInTheDocument();
    });

    // ── Drag and drop ───────────────────────────────────────────────────────────

    it('highlights the drop zone on dragOver', () => {
        render(<UploadZone onFile={jest.fn()} loading={false} />);
        const label = screen.getByText('Drop your lab report here').closest('label')!;

        // Simulate a file being dragged over the drop zone
        fireEvent.dragOver(label, { preventDefault: () => { } });

        // The drag-active border class should be applied
        expect(label).toHaveClass('border-brand-500');
    });

    it('removes highlight on dragLeave', () => {
        render(<UploadZone onFile={jest.fn()} loading={false} />);
        const label = screen.getByText('Drop your lab report here').closest('label')!;

        fireEvent.dragOver(label, { preventDefault: () => { } });
        fireEvent.dragLeave(label);

        // Drag-active class should be removed after leave
        expect(label).not.toHaveClass('border-brand-500');
    });

    it('calls onFile when a valid PDF is dropped', async () => {
        const onFile = jest.fn();
        render(<UploadZone onFile={onFile} loading={false} />);
        const label = screen.getByText('Drop your lab report here').closest('label')!;

        // Simulate dropping a valid PDF file
        fireEvent.drop(label, {
            preventDefault: () => { },
            dataTransfer: { files: [validPDF] },
        });

        expect(onFile).toHaveBeenCalledWith(validPDF);
    });

    // ── Loading state ───────────────────────────────────────────────────────────

    it('disables interaction when loading is true', () => {
        render(<UploadZone onFile={jest.fn()} loading={true} />);
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        const label = screen.getByText('Drop your lab report here').closest('label')!;

        // Input should be disabled
        expect(input).toBeDisabled();
        // Label should have the pointer-events-none class to block clicks
        expect(label).toHaveClass('pointer-events-none');
        // Visual opacity should be reduced
        expect(label).toHaveClass('opacity-60');
    });
});