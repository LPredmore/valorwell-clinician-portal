
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';
import { Upload } from 'tus-js-client';

const supabaseUrl = 'https://gqlkritspnhjxfejvgfg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbGtyaXRzcG5oanhmZWp2Z2ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3NjQ0NDUsImV4cCI6MjA1ODM0MDQ0NX0.BtnTfcjvHI55_fs_zor9ffQ9Aclg28RSfvgZrWpMuYs';

interface DocumentInfo {
  clientId: string;
  documentType: string;
  documentDate: string | Date;
  documentTitle: string;
  createdBy?: string;
}

// Create a TUS resumable upload
async function uploadLargeFile(bucketId: string, filePath: string, fileBlob: Blob): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const upload = new Upload(fileBlob, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000],
      metadata: { bucketName: bucketId, objectName: filePath },
      headers: { 
        Authorization: `Bearer ${supabaseKey}`, 
        'x-upsert': 'true' 
      },
      uploadDataDuringCreation: true,
      onError: (err) => {
        console.error('❌ [PDF-GEN] TUS upload failed:', err);
        reject(err);
      },
      onSuccess: () => {
        console.log('✅ [PDF-GEN] TUS upload succeeded');
        resolve();
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
        console.log(`📊 [PDF-GEN] Upload progress: ${percentage}% (${bytesUploaded}/${bytesTotal} bytes)`);
      }
    });
    
    console.log('🚀 [PDF-GEN] Starting TUS resumable upload...');
    upload.start();
  });
}

/**
 * Generates PDF from an HTML element and saves it to Supabase storage
 */
export const generateAndSavePDF = async (
  elementId: string,
  documentInfo: DocumentInfo
): Promise<string | null> => {
  try {
    console.log('📄 [PDF-GEN] Starting PDF generation for:', {
      elementId,
      clientId: documentInfo.clientId,
      documentType: documentInfo.documentType,
      documentDate: typeof documentInfo.documentDate === 'string' 
        ? documentInfo.documentDate 
        : documentInfo.documentDate.toISOString().split('T')[0],
      documentTitle: documentInfo.documentTitle
    });

    // Skip bucket validation - proceed directly to upload
    // (Bucket validation fails with anon key due to RLS policies, but upload works)
    console.log('🪣 [PDF-GEN] Proceeding with direct upload to clinical_documents bucket...');
    
    // DEBUG: Log auth context before upload (simplified)
    console.debug('[PDF-GEN] Starting upload with Supabase client...');

    // Format date for file naming
    const formattedDate = typeof documentInfo.documentDate === 'string' 
      ? documentInfo.documentDate 
      : documentInfo.documentDate.toISOString().split('T')[0];

    console.log('📅 [PDF-GEN] Formatted date:', formattedDate);
    
    // Step 1: Generate PDF from HTML element
    const element = document.getElementById(elementId);
    if (!element) {
      console.error('❌ Element not found for PDF generation:', elementId);
      console.log('Available elements with IDs:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
      return null;
    }
    
    console.log('✅ Found element for PDF generation:', {
      elementId,
      elementTagName: element.tagName,
      elementClasses: element.className,
      hasContent: element.innerHTML.length > 0
    });
    
    // Add a class to control styling for PDF generation
    element.classList.add('generating-pdf');
    
    // Create a deep clone for PDF generation to avoid modifying the original
    const clone = element.cloneNode(true) as HTMLElement;
    document.body.appendChild(clone);
    
    // Process all form elements in the clone to ensure their values are properly rendered
    processFormElementsForPDF(clone);
    
    // Position the clone off-screen
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    clone.style.width = element.offsetWidth + 'px';
    clone.style.backgroundColor = 'white';
    clone.style.padding = '20px';
    
    // Wait a moment for styles to apply
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get dimensions for PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 10; // margin in mm
    const contentWidth = pdfWidth - (margin * 2);
    
    // Create canvas from the prepared clone with very conservative settings
    const canvas = await html2canvas(clone, {
      scale: 0.5, // Very aggressive reduction to prevent massive file sizes
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: clone.offsetWidth,
      removeContainer: true,
      onclone: clonedDoc => {
        // Process all form elements in the cloned document
        const clonedElement = clonedDoc.body.lastChild as HTMLElement;
        clonedElement.style.width = clone.offsetWidth + 'px';
        
        // Ensure all form values are properly rendered
        const textareas = clonedElement.querySelectorAll('textarea');
        textareas.forEach(textarea => {
          const value = textarea.value;
          const div = document.createElement('div');
          div.className = 'pdf-value-display';
          div.textContent = value;
          div.style.whiteSpace = 'pre-wrap';
          if (textarea.parentNode) {
            textarea.parentNode.replaceChild(div, textarea);
          }
        });
      }
    });

    console.log(`🔍 [PDF-GEN] Canvas dimensions: ${canvas.width}x${canvas.height}, Scale: 0.5`);
    
    // Calculate scaling for the PDF
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Handle multi-page PDFs if the content is too long
    let position = margin;
    const pageHeight = pdfHeight - margin * 2;
    
    // Add the first page
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, position, imgWidth, imgHeight);
    
    // Add additional pages if needed
    let heightLeft = imgHeight - pageHeight;
    
    while (heightLeft > 0) {
      position = margin - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    // Clean up the clone
    document.body.removeChild(clone);
    
    // Remove PDF generation class from original element
    element.classList.remove('generating-pdf');
    
    // Convert PDF to blob
    const pdfBlob = pdf.output('blob');
    
    // Step 2: Upload PDF to Supabase storage
    console.log('🛠️ [PDF-GEN] Generating file path...');
    
    // Normalize document type for file path (remove spaces, special chars, lowercase)
    const normalizedDocType = documentInfo.documentType
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
    
    const timestamp = Date.now();
    const filename = `${formattedDate}-${timestamp}.pdf`;
    const filePath = `${documentInfo.clientId}/${normalizedDocType}/${filename}`;
    
    console.log('📂 [PDF-GEN] File path details:', {
      originalDocType: documentInfo.documentType,
      normalizedDocType,
      clientId: documentInfo.clientId,
      formattedDate,
      timestamp,
      filename,
      finalPath: filePath,
      blobSize: pdfBlob.size,
      bucket: 'clinical_documents'
    });

    // Validate file path before upload
    if (!filePath || filePath.includes('//') || filePath.includes(' ')) {
      console.error('❌ [PDF-GEN] Invalid file path generated:', filePath);
      return null;
    }
    
    console.log('📤 [PDF-GEN] Attempting resumable upload with TUS...');
    
    // DEBUG: Pre-upload debug info
    console.debug('[PDF-GEN] Pre-upload debug info:', {
      bucketName: 'clinical_documents',
      filePath,
      blobSize: pdfBlob.size,
      contentType: 'application/pdf',
      hasFile: !!pdfBlob,
      currentUser: 'anon (assumed)',
      uploadMethod: 'TUS resumable'
    });
    
    // Use TUS resumable upload instead of standard upload
    let uploadError = null;
    let uploadSuccess = false;
    
    try {
      await uploadLargeFile('clinical_documents', filePath, pdfBlob);
      console.log('✅ [PDF-GEN] Resumable upload completed successfully');
      uploadSuccess = true;
      uploadError = null;
    } catch (error) {
      uploadError = error;
      uploadSuccess = false;
      console.error('❌ [PDF-GEN] TUS upload failed with error:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        filePath,
        blobSize: pdfBlob.size,
        uploadMethod: 'TUS resumable'
      });
    }
    
    if (!uploadSuccess || uploadError) {
      console.error('❌ [PDF-GEN] All upload attempts failed:', {
        finalError: uploadError,
        filePath,
        errorMessage: uploadError?.message,
        errorCode: (uploadError as any)?.statusCode || 'unknown',
        errorDetails: uploadError
      });
      return null;
    }
    
    console.log('✅ [PDF-GEN] PDF uploaded successfully to:', filePath);
    
    // Verify the upload by checking if file exists
    console.log('🔍 [PDF-GEN] Verifying upload...');
    try {
      const { data: fileList, error: listError } = await supabase.storage
        .from('clinical_documents')
        .list(filePath.substring(0, filePath.lastIndexOf('/')));
      
      if (listError) {
        console.warn('⚠️ [PDF-GEN] Could not verify upload:', listError);
      } else {
        const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
        const fileExists = fileList?.some(file => file.name === fileName);
        console.log('✅ [PDF-GEN] Upload verification:', {
          fileExists,
          expectedFileName: fileName,
          filesInDirectory: fileList?.map(f => f.name)
        });
      }
    } catch (verificationError) {
      console.warn('⚠️ [PDF-GEN] Upload verification failed:', verificationError);
    }
    
    // Step 3: Final validation and return
    console.log('🎯 [PDF-GEN] PDF generation process completed successfully');
    console.log('📍 [PDF-GEN] Final file path:', filePath);
    
    // Note: Document metadata is saved separately by the calling function
    // This function only handles PDF generation and storage
    
    return filePath;
  } catch (error) {
    console.error('❌ [PDF-GEN] Critical error in PDF generation:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      elementId,
      documentInfo
    });
    return null;
  }
};

/**
 * Process form elements to ensure their values are properly displayed in the PDF
 */
const processFormElementsForPDF = (element: HTMLElement) => {
  // Process all inputs
  const inputs = element.querySelectorAll('input');
  inputs.forEach(input => {
    if (input.type === 'text' || input.type === 'date') {
      // Create a visible text representation of the input value
      const valueDiv = document.createElement('div');
      valueDiv.className = 'pdf-value-display';
      valueDiv.textContent = input.value || '';
      
      // Ensure proper sizing and padding
      valueDiv.style.minHeight = '32px';
      valueDiv.style.padding = '8px 12px';
      valueDiv.style.border = '1px solid #d1d5db';
      valueDiv.style.borderRadius = '6px';
      valueDiv.style.backgroundColor = '#ffffff';
      valueDiv.style.fontSize = '14px';
      valueDiv.style.lineHeight = '1.5';
      valueDiv.style.wordWrap = 'break-word';
      valueDiv.style.overflow = 'visible';
      
      // Replace the input with the div
      if (input.parentNode) {
        input.parentNode.replaceChild(valueDiv, input);
      }
    }
  });
  
  // Process textareas - replace with div to maintain line breaks and content size
  const textareas = element.querySelectorAll('textarea');
  textareas.forEach(textarea => {
    // Create a div to represent the textarea content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'pdf-value-display textarea-content';
    
    // Preserve content and line breaks
    const content = textarea.value || '';
    contentDiv.textContent = content;
    contentDiv.style.whiteSpace = 'pre-wrap';
    contentDiv.style.wordWrap = 'break-word';
    contentDiv.style.overflow = 'visible';
    
    // Calculate proper height based on content
    const lineCount = (content.match(/\n/g) || []).length + 1;
    const estimatedLines = Math.max(lineCount, Math.ceil(content.length / 60));
    const minHeight = Math.max(estimatedLines * 24, 80); // 24px per line, minimum 80px
    
    contentDiv.style.minHeight = `${minHeight}px`;
    contentDiv.style.height = 'auto';
    contentDiv.style.maxHeight = 'none';
    contentDiv.style.padding = '12px';
    contentDiv.style.border = '1px solid #d1d5db';
    contentDiv.style.borderRadius = '6px';
    contentDiv.style.backgroundColor = '#ffffff';
    contentDiv.style.fontSize = '14px';
    contentDiv.style.lineHeight = '1.6';
    contentDiv.style.fontFamily = 'Arial, sans-serif';
    
    // Replace the textarea with the content div
    if (textarea.parentNode) {
      textarea.parentNode.replaceChild(contentDiv, textarea);
    }
  });
  
  // Process select elements and custom select components
  processSelectElements(element);
  
  // Process elements with data-pdf-value attributes
  const elementsWithDataAttributes = element.querySelectorAll('[data-pdf-value]');
  elementsWithDataAttributes.forEach(el => {
    const pdfValue = el.getAttribute('data-pdf-value');
    if (pdfValue) {
      const valueDiv = document.createElement('div');
      valueDiv.className = 'pdf-value-display';
      valueDiv.textContent = pdfValue;
      valueDiv.style.whiteSpace = 'pre-wrap';
      valueDiv.style.minHeight = '32px';
      valueDiv.style.padding = '8px 12px';
      valueDiv.style.border = '1px solid #d1d5db';
      valueDiv.style.borderRadius = '6px';
      valueDiv.style.backgroundColor = '#ffffff';
      valueDiv.style.fontSize = '14px';
      valueDiv.style.lineHeight = '1.5';
      valueDiv.style.wordWrap = 'break-word';
      valueDiv.style.overflow = 'visible';
      
      if (el.parentNode) {
        el.parentNode.replaceChild(valueDiv, el as Node);
      }
    }
  });
  
  // Hide any remaining form controls that might interfere with PDF rendering
  const formControls = element.querySelectorAll('button:not(.pdf-visible), .lucide');
  formControls.forEach(control => {
    (control as HTMLElement).style.display = 'none';
  });
  
  // Hide private notes
  const privateNotes = element.querySelectorAll('.private-note-container');
  privateNotes.forEach(note => {
    (note as HTMLElement).style.display = 'none';
  });
  
  return element;
};

/**
 * Process select elements and radix select components
 */
const processSelectElements = (element: HTMLElement) => {
  // Process native select elements
  const selects = element.querySelectorAll('select');
  selects.forEach(select => {
    const selectedOption = select.options[select.selectedIndex];
    const valueDiv = document.createElement('div');
    valueDiv.className = 'pdf-value-display';
    valueDiv.textContent = selectedOption ? selectedOption.text : '';
    
    // Style the select replacement
    valueDiv.style.minHeight = '32px';
    valueDiv.style.padding = '8px 12px';
    valueDiv.style.border = '1px solid #d1d5db';
    valueDiv.style.borderRadius = '6px';
    valueDiv.style.backgroundColor = '#ffffff';
    valueDiv.style.fontSize = '14px';
    valueDiv.style.lineHeight = '1.5';
    valueDiv.style.wordWrap = 'break-word';
    valueDiv.style.overflow = 'visible';
    
    // Replace the select with the div
    if (select.parentNode) {
      select.parentNode.replaceChild(valueDiv, select);
    }
  });
  
  // Process Radix UI Select components by finding the trigger and its associated value
  const selectTriggers = element.querySelectorAll('[data-radix-select-trigger]');
  selectTriggers.forEach(selectTrigger => {
    let valueText = '';
    
    // Try multiple methods to get the select value
    const selectValue = selectTrigger.querySelector('[data-radix-select-value]');
    if (selectValue && selectValue.textContent && selectValue.textContent.trim() !== '') {
      valueText = selectValue.textContent.trim();
    }
    
    // Look for data attribute on the trigger itself
    const dataValue = selectTrigger.getAttribute('data-select-value');
    if (dataValue) {
      valueText = dataValue;
    }
    
    // Look for a hidden span with the value
    const parentContainer = selectTrigger.parentNode as HTMLElement;
    if (parentContainer) {
      const hiddenValue = parentContainer.querySelector('.select-pdf-value');
      if (hiddenValue && hiddenValue.textContent) {
        valueText = hiddenValue.textContent.trim();
      }
    }
    
    const valueDiv = document.createElement('div');
    valueDiv.className = 'pdf-value-display select-value';
    valueDiv.textContent = valueText || '';
    
    // Style the select replacement
    valueDiv.style.minHeight = '32px';
    valueDiv.style.padding = '8px 12px';
    valueDiv.style.border = '1px solid #d1d5db';
    valueDiv.style.borderRadius = '6px';
    valueDiv.style.backgroundColor = '#ffffff';
    valueDiv.style.fontSize = '14px';
    valueDiv.style.lineHeight = '1.5';
    valueDiv.style.wordWrap = 'break-word';
    valueDiv.style.overflow = 'visible';
    
    // Replace the select trigger with the value div
    if (selectTrigger.parentNode) {
      selectTrigger.parentNode.replaceChild(valueDiv, selectTrigger as Node);
    }
  });
  
  // Process any remaining select containers
  const selectContainers = element.querySelectorAll('[role="combobox"]');
  selectContainers.forEach(container => {
    const valueDiv = document.createElement('div');
    valueDiv.className = 'pdf-value-display';
    valueDiv.textContent = container.textContent?.trim() || '';
    
    // Style the replacement
    valueDiv.style.minHeight = '32px';
    valueDiv.style.padding = '8px 12px';
    valueDiv.style.border = '1px solid #d1d5db';
    valueDiv.style.borderRadius = '6px';
    valueDiv.style.backgroundColor = '#ffffff';
    valueDiv.style.fontSize = '14px';
    valueDiv.style.lineHeight = '1.5';
    valueDiv.style.wordWrap = 'break-word';
    valueDiv.style.overflow = 'visible';
    
    if (container.parentNode) {
      container.parentNode.replaceChild(valueDiv, container as Node);
    }
  });
};
