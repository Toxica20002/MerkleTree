import { notification } from 'antd';
import { PDFDocument } from 'pdf-lib';
import { AppMode, currentMode, REQUIRED_SECTION_MARK } from '../constants';

const openNotificationWithIcon = (type, message, description) => {
  notification[type]({
    message,
    description,
    duration: type === 'success' ? 6 : 15,
  });
};

export const getFileContent = (inputFile: any) => {
  const temporaryFileReader = new FileReader();

  return new Promise((resolve, reject) => {
    temporaryFileReader.onerror = () => {
      temporaryFileReader.abort();
      reject(new DOMException('Problem parsing input file.'));
    };

    temporaryFileReader.onload = () => {
      resolve(temporaryFileReader.result as any);
    };
    temporaryFileReader.readAsText(inputFile);
  });
};

// input array base64
// output student info
export const extractData = async (
  inputFile: any,
): Promise<{
  fileContent: string;
  isMandatory: boolean;
  citizenId?: number;
  citiSel?: number;
  countOfDisagree?: number;
  countOfAgree?: number;
  result?: boolean
}> => {
  const temporaryFileReader = new FileReader();

  let countOfDisagree: number = 0;
  let countOfAgree: number = 0;
  let citizenId: string | undefined;
  // let citiSel: number | undefined;
  let citiSel: number = 0;
  const isMandatory = inputFile.name.indexOf(REQUIRED_SECTION_MARK) > -1;

  return new Promise((resolve, reject) => {
    temporaryFileReader.onerror = () => {
      temporaryFileReader.abort();
      reject(new DOMException('Problem parsing input file.'));
    };

    temporaryFileReader.onload = async () => {
      if (currentMode == AppMode.thesis) {
        // Function read pdf UTF8
        const pdfDoc = await PDFDocument.load(
          temporaryFileReader.result as ArrayBuffer,
        );
          // read file form
        const form = pdfDoc.getForm();
try {
  if (isMandatory) {
    citizenId = form.getTextField('txtCID').getText();
    console.log('Quan Test Extract Data');
    citizenId = citizenId   ? citizenId.substring(citizenId.length - 5)  : '';
    console.log('citizenId ', citizenId);

    const temp = form.getTextField('txtSelection').getText();
    console.log('citiSel ', temp);
    if(temp === 'Agree') {
      citiSel = 1;
      countOfAgree++;
    }
    else if(temp === 'Disagree') {
      citiSel = 2;
      countOfDisagree++;
    }


  } else {
    citizenId = form.getTextField('txtMSSV').getText();
    citizenId = citizenId
     ? citizenId.substring(citizenId.length - 5)
      : '';
    console.log('citizenId of non Require file', citizenId);
    citiSel = 0;
  }
} catch (error) {
  openNotificationWithIcon(
    'error',
    'Cannot extract auditable data',
    'Please re-check the uploaded files and try again.'
  );
  return resolve({ fileContent: '', isMandatory, result: false });
}
      }

      return resolve({
        fileContent: new TextDecoder().decode(
          temporaryFileReader.result as ArrayBuffer,
        ),
        isMandatory,
        citizenId: citizenId ? parseInt(citizenId) : 0,
        // citiSel: citiSel ? citiSel*10 : 0,
        citiSel: citiSel ? citiSel : 0,
        countOfDisagree,
        countOfAgree,
      });
    };
    temporaryFileReader.readAsArrayBuffer(inputFile);
  });
};
