// ─── Tests: UploadZone ───────────────────────────────────────────────────────
// Tests file validation (type and size), the onFile callback, drag state,
// and disabled behavior during loading.

import { render, screen, fireEvent, act } from '@testing-library/react';
import UploadZone from '@/app/components/UploadZone';

// Helper — creates a File object with the given name, size, and MIME type
function makeFile(name: string, sizeBytes: number, type: string): File {
    const content = new Uint8Array(sizeBytes);
    return new File([content], name, { type });
}

const validPDF = makeFile('report.pdf', 1024, 'application/pdf');
const largePDF = makeFile('large.pdf', 11 * 1024 * 1024, 'application/pdf');
const imageFile = makeFile('photo.png', 1024, 'image/png');

// Helper — fires a change event on the hidden file input with the given file.
// userEvent.upload does not reliably trigger onChange on hidden inputs in all
// versions of @testing-library/user-event, so we use fireEvent.change directly.
function uploadFile(file: File) {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
}

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

    it('calls onFile with a valid PDF when selected via the input', () => {
        const onFile = jest.fn();
        render(<UploadZone onFile={onFile} loading={false} />);

        uploadFile(validPDF);

        expect(onFile).toHaveBeenCalledTimes(1);
        expect(onFile).toHaveBeenCalledWith(validPDF);
    });

    // ── Validation errors ───────────────────────────────────────────────────────

    it('shows an error and does not call onFile for a non-PDF file', () => {
        const onFile = jest.fn();
        render(<UploadZone onFile={onFile} loading={false} />);

        uploadFile(imageFile);

        expect(screen.getByText('Only PDF files are supported.')).toBeInTheDocument();
        expect(onFile).not.toHaveBeenCalled();
    });

    it('shows an error and does not call onFile for a PDF over 10MB', () => {
        const onFile = jest.fn();
        render(<UploadZone onFile={onFile} loading={false} />);

        uploadFile(largePDF);

        expect(screen.getByText('File must be under 10MB.')).toBeInTheDocument();
        expect(onFile).not.toHaveBeenCalled();
    });

    it('clears a previous error when a valid file is selected', () => {
        const onFile = jest.fn();
        render(<UploadZone onFile={onFile} loading={false} />);

        // Trigger error with invalid file
        uploadFile(imageFile);
        expect(screen.getByText('Only PDF files are supported.')).toBeInTheDocument();

        // Upload valid file — error should disappear
        uploadFile(validPDF);
        expect(screen.queryByText('Only PDF files are supported.')).not.toBeInTheDocument();
    });

    // ── Drag and drop ───────────────────────────────────────────────────────────

    it('highlights the drop zone on dragOver', () => {
        render(<UploadZone onFile={jest.fn()} loading={false} />);
        const label = screen.getByText('Drop your lab report here').closest('label')!;

        fireEvent.dragOver(label, { preventDefault: () => { } });

        expect(label).toHaveClass('border-brand-500');
    });

    it('removes highlight on dragLeave', () => {
        render(<UploadZone onFile={jest.fn()} loading={false} />);
        const label = screen.getByText('Drop your lab report here').closest('label')!;

        fireEvent.dragOver(label, { preventDefault: () => { } });
        fireEvent.dragLeave(label);

        expect(label).not.toHaveClass('border-brand-500');
    });

    it('calls onFile when a valid PDF is dropped', () => {
        const onFile = jest.fn();
        render(<UploadZone onFile={onFile} loading={false} />);
        const label = screen.getByText('Drop your lab report here').closest('label')!;

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

        expect(input).toBeDisabled();
        expect(label).toHaveClass('pointer-events-none');
        expect(label).toHaveClass('opacity-60');
    });
});