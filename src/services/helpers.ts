import { pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

export const readPdfFile = async (inputFile: any) => {
  const temporaryFileReader = new FileReader();

  return new Promise((resolve, reject) => {
    temporaryFileReader.onerror = () => {
      temporaryFileReader.abort();
      reject(new DOMException('Problem parsing input file.'));
    };

    temporaryFileReader.onload = () => { //Function read pdf UTF8
      pdfjs 
        .getDocument(temporaryFileReader.result as any)
        .promise.then((PDFDocumentInstance) => {
          PDFDocumentInstance.getPage(1).then(function (pdfPage) {
            // The main trick to obtain the text of the PDF page, use the getTextContent method
            pdfPage.getTextContent().then(function (textContent) {
              var textItems = textContent.items;
              // lấy [3] và lấy 5 số
              resolve(textItems[3].str.substring(textItems[3].str.length - 5));
            });
          });
        });
    };
    temporaryFileReader.readAsArrayBuffer(inputFile);
  });
};
