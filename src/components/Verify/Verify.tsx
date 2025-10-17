import { SafetyCertificateOutlined, ScanOutlined } from '@ant-design/icons';
import {
  decodePDFRawStream,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFRawStream,
  PDFStream,
  PDFString,
} from 'pdf-lib';

import { Button, List, notification, Popconfirm, Steps, Tag } from 'antd';
import SHA256 from 'crypto-js/sha256';
import Lottie from 'lottie-react-web';
import React from 'react';
import { Animated } from 'react-animated-css';
import Dropzone from 'react-dropzone';
import Web3 from 'web3';

import { abi, COLOR, REQUIRED_SECTION_MARK } from '../../constants';
import {
  getInstituteInfo,
  // getRoot,
  verifyWithRevocationList,
} from '../../libs/smartContractUtils';
import { verify } from '../../libs/verifymt';
import { verifyPKI } from '../../libs/verifyPKI';

import { Column } from '@ant-design/plots';
import JSZip from 'jszip';
import { pdfjs } from 'react-pdf';
import { ISection } from '../../models/section.model';
import { extractData, getFileContent } from '../../services/extractData';
import { validateReceipt } from '../../services/merkletreeUtils';
import CustomDrawer from '../Drawer/Drawer';
import { firework } from './firework';
import './Verify.css';



pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;



const openNotificationWithIcon = (type, message, description) => {
  notification[type]({
    message,
    description,
    duration: type === 'success' ? 6 : 15,
  });
};

const descriptionStep = (data) => (
  <List
    size="small"
    dataSource={data}
    renderItem={(item) => <List.Item> {item} </List.Item>}
  />
);

let SumOfDisagree = 0;
let SumOfAgree = 0;

const { Step } = Steps;

const initialState = {
  receipt: {},
  hashedCert: '',
  waitingForFileUpload: false,
  web3: new Web3(Web3.givenProvider || 'http://localhost:8545'),
  fileType: 'certificate',
  currentFileType: 'digital opinion',
  steps: [
    // {
    //   message: 'Load blockchain receipt',
    //   status: 'process',
    //   description: descriptionStep([
    //     '1. Load the blockchain receipt',
    //     '2. Verify the smart contract address signature',
    //     '3. Call the smart contract with the address attached in the receipt',
    //     '4. Get the information from that smart contract',
    //   ]),
    // },
    {
      message: 'Load digital opinion',
      status: 'process',
      description: descriptionStep([
        '1. Load the digital opinion',
        '2. Hash the content of the certififcate',
      ]),
    },
    {
      message: 'Verify with Smart Contract',
      status: 'wait',
      description: descriptionStep([
        '1. Call the smart contract with the address embedded in the receipt',
        '2. Compare the Auditable Merkle Tree Root in the smart contract with the calculated one using proof and leaf data in the receipt',
      ]),
    },
    {
      message: 'Verify with Revocation List',
      status: 'wait',
      description: descriptionStep([
        '1. Check the existence of the hashed content of the opinion in revocation list in smart contract',
      ]),
    },
    { message: 'Done', status: 'wait' },
  ],
  currentStep: 0,
  renderFireWork: false,
  instituteInfo: {},
  certFile: [],
  sectionHash: [],
  hashedUploadFileArray: [],
  sections: [],
  corresspondingSections: [],
  issuedDate: undefined,
  year: 0,
  credentialID: '',
};

interface IState {
  receipt: any;
  hashedCert: string;
  waitingForFileUpload: boolean;
  web3: any;
  fileType: string;
  currentFileType: string;
  steps: any;
  currentStep: number;
  renderFireWork: boolean;
  instituteInfo: object;
  issuedDate: Date | undefined;
  year: number,
  certFile: any[];
  sectionHash: any[];
  hashedUploadFileArray: any[];
  sections: ISection[];
  corresspondingSections: any[];
  credentialID: string;
}

interface Props {
  MyContract: any;
}

class Verify extends React.Component<Props, IState> {
  static readUploadedFileAsText = (inputFile) => {
    const temporaryFileReader = new FileReader();

    return new Promise((resolve, reject) => {
      temporaryFileReader.onerror = () => {
        temporaryFileReader.abort();
        reject(new DOMException('Problem parsing input file.'));
      };

      temporaryFileReader.onload = () => {
        resolve(temporaryFileReader.result as {});
      };
      temporaryFileReader.readAsText(inputFile);
    });
  };

  private drawer: any;
  private dropzone: any;
  constructor(props) {
    super(props);
    this.drawer = React.createRef();
    this.dropzone = React.createRef();
    this.state = {
      ...initialState,
    };
  }

  onDrop = (files) => {
    // files.forEach(file => {
    //   console.log('File type:', file.type);
    // });
    if (this.state.fileType === 'receipt') {
      this.uploadReceipt(files);
    } else {
      this.uploadCert(files);
    }
  };

  onCancel = () => {
    // this.setState({
    //   files: [],
    // });
  };

  checkMandatory = (receiptObject) => {
    const { sections } = receiptObject;
    const mandatoryObject = sections.filter((e) => e.mandatory === true);
    if (mandatoryObject.length === 0) {
      return false;
    } else {
      return true;
    }
  };

  uploadReceipt = async (files) => {
    this.setState({ waitingForFileUpload: true });
    const receiptFile = files[0];
    let receiptContents;

    // Uploads will push to the file input's `.files` array. Get the last uploaded file.

    try {
      receiptContents = await Verify.readUploadedFileAsText(receiptFile);
      this.setState({
        waitingForFileUpload: false,
      });
    } catch (e) {
      console.log(e);
      this.setState({
        waitingForFileUpload: false,
      });
    }

    // STEP 0: Got the receipt
    const receiptObject = JSON.parse(receiptContents);
    const { sections } = receiptObject;
    console.log("in receipts: ", sections)
    const sectionNames = [] as any[];
    for (let p = 0; p < sections.length; p++) {
      sectionNames.push(sections[p].name);
    }

    const sectionHash = [] as any[];
    for (let p = 0; p < sections.length; p++) {
      sectionHash.push(sections[p].hash);
    }

    const credentialID = receiptObject.credentialID;

    this.setState({ credentialID, sections });

    if (!this.checkMandatory(receiptObject)) {
      this.setState({
        currentStep: 0,
      });
      this.state.steps[0].status = 'error';
      this.forceUpdate();
      openNotificationWithIcon(
        'error',
        'Invalid receipt',
        <p>
          Invalid receipt. The selective disclosure must include a mandatory
          section
        </p>,
      );
    } else {
      // TODO- Fix prevent transaction and contract address can be faked by old valid receipt
      console.log("Checking Transaction and Contract Address in receipt");
      const transactionReceipt = await this.getTransactionReceipt(receiptObject) // get all receipt from Transaction Hash in receipt json file
      if (transactionReceipt.contractAddress !== receiptObject.contractAddress || transactionReceipt.transactionHash !== receiptObject.transactionHash) {
        this.state.steps[0].status = 'error';
        this.forceUpdate();
        openNotificationWithIcon(
          'error',
          'Invalid receipt',
          <p>The Transaction Hash / Contract Adress in Receipt is not the same with Smart Contract Info</p>,
        );
        console.log("The Transaction Hash / Contract Adress in Receipt is not the same with Smart Contract Info");
        return false;
      }
      
      console.log("Checking auditable data, transaction hash and contract adress in receipt");

      const validateReceiptAuditableDataResult = await this.verifyReceiptAuditableData(receiptObject);
      if (!validateReceiptAuditableDataResult) {

        return false;
      }
      else {
        const instituteInfo = await this.getInstituteInfo(receiptObject);
        const issuedDate = await this.getIssuedDate(receiptObject);
        console.log('issuedDate', issuedDate);
        const smartContractOwner = instituteInfo[4];
        this.setState({ instituteInfo });

        const verifyPKIResult = verifyPKI(smartContractOwner, receiptObject);

        const isDateValid = () => {
          const currentDate = new Date(issuedDate);
          const notBefore = new Date(verifyPKIResult.CertValidityNotBefore);
          const notAfter = new Date(verifyPKIResult.CertValidityNotAfter);
          return currentDate >= notBefore && currentDate <= notAfter
        }
        if (isDateValid()) {
          console.log('issuedDate is valid in range of CA')
        } else {
          console.log('issuedDate is not valid in range of CA')
        }


        // TODO: Fix if receipt expire but the transaction hash show that the date is valid => make it pass 
        // TODO: Comment out this code for final version - To check if Receipt date is not valid
        // if (!isDateValid()) {
        //   this.state.steps[0].status = 'error';
        //   this.forceUpdate();
        //   openNotificationWithIcon(
        //     'error',
        //     'Invalid receipt',
        //     <p>Invalid receipt. The Receipt Issued Date is not in range of CA.</p>,
        //   );
        //   return false;
        // }

        if (verifyPKIResult.r === false) {
          openNotificationWithIcon(
            'warning',
            'CA is overdue',
            <p>Your receipt issued Date is still valid for verifying</p>,
          );
        }
        const issuerCommonName = verifyPKIResult.CommonName;
        const issuerEmail = verifyPKIResult.Email;
        const issuerOrganization = verifyPKIResult.Organization;
        const addInstituteInfo = {
          7: issuerCommonName,
          8: issuerEmail,
          9: issuerOrganization
        };
        this.setState({
          receipt: receiptObject,
          fileType: 'certificate',
          currentFileType: 'digital opinion',
          instituteInfo: { ...this.state.instituteInfo, ...addInstituteInfo },
          issuedDate,
        });

        console.log('instituteInfo: ', instituteInfo);
        console.log('issuedDate - setstate: ', issuedDate);
        if (instituteInfo[0] !== '0x' + SHA256(issuerCommonName).toString()) {
          this.state.steps[0].status = 'error';
          this.forceUpdate();
          openNotificationWithIcon(
            'error',
            'Invalid institude name',
            <p>
              The institude name in your receipt ( {instituteInfo[0]} ) and the
              name given by trusted authority ( {issuerCommonName} ) are not
              matched.
            </p>,
          );
        }
        //  else {
        //   this.state.steps[1].status = 'process';
        //   this.forceUpdate();
        //   this.setState({ currentStep: 1 });
        //   openNotificationWithIcon(
        //     'info',
        //     'Note',
        //     <div>
        //       Please upload your{' '}
        //       <ol>
        //         {sectionNames.map((sectionName) => (
        //           <li key={sectionName}>{sectionName}</li>
        //         ))}{' '}
        //       </ol>
        //       to begin the verifying process. You can either click this Button{' '}
        //       <Tag
        //         color="blue"
        //         onClick={(e) => {
        //           this.dropzone.current.onClick(e);
        //           notification.destroy();
        //         }}
        //       >
        //         Upload certificate
        //       </Tag>
        //       or drag your file to the dropzone
        //     </div>,
        //   );
        // }
      }
    }

    this.setState({ sectionHash });
  };

  extractRawAttachments = (pdfDoc: PDFDocument) => {
    if (!pdfDoc.catalog.has(PDFName.of('Names'))) return [];
    const Names = pdfDoc.catalog.lookup(PDFName.of('Names'), PDFDict);

    if (!Names.has(PDFName.of('EmbeddedFiles'))) return [];
    const EmbeddedFiles = Names.lookup(PDFName.of('EmbeddedFiles'), PDFDict);

    if (!EmbeddedFiles.has(PDFName.of('Names'))) return [];
    const EFNames = EmbeddedFiles.lookup(PDFName.of('Names'), PDFArray);

    const rawAttachments: { fileName: PDFHexString | PDFString; fileSpec: PDFDict }[] = [];
    for (let idx = 0, len = EFNames.size(); idx < len; idx += 2) {
      const fileName = EFNames.lookup(idx) as PDFHexString | PDFString;
      const fileSpec = EFNames.lookup(idx + 1, PDFDict);
      rawAttachments.push({ fileName, fileSpec });
    }

    return rawAttachments;
  };

  extractAttachments = (pdfDoc: PDFDocument) => {
    const rawAttachments = this.extractRawAttachments(pdfDoc);

    return rawAttachments.map(({ fileName, fileSpec }) => {
      const stream = fileSpec
        .lookup(PDFName.of('EF'), PDFDict)
        .lookup(PDFName.of('F'), PDFStream) as PDFRawStream;
      return {
        name: fileName.decodeText(),
        data: decodePDFRawStream(stream).decode(),
      };
    });
  };

  uploadCert = async (files) => {
    const pdfBytes = new Uint8Array(await files[0].arrayBuffer());
    const pdfWithAttachments = await PDFDocument.load(pdfBytes);
    const attachments = this.extractAttachments(pdfWithAttachments);


    console.log('attachments: ', attachments);

    const logo = attachments[0];

    const combinedBuffer = Buffer.from(logo.data);
    const signature = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
    const startIndex = combinedBuffer.indexOf(signature);

    if (startIndex === -1) {
      console.error('No ZIP signature found in this image.');
      return;
    }
    const zipBuffer = combinedBuffer.slice(startIndex);

    // extract the zip file
    const zip = new JSZip();
    await zip.loadAsync(zipBuffer);
    const zipFiles = zip.files;
    const fileNames = Object.keys(zipFiles);
    console.log('fileNames: ', fileNames);



    const firstFile = zipFiles[fileNames[0]];
    console.log('file: ', firstFile);
    const firstBlob = await firstFile.async('blob');
    const jsonFile = new File([firstBlob], firstFile.name, { type: 'application/json' });
    console.log('jsonFile: ', jsonFile);

    // array of files
    const jsonFiles: any[] = [];
    jsonFiles.push(jsonFile);

    await this.uploadReceipt(jsonFiles);



    // get the second file in the zip
    const secondFile = zipFiles[fileNames[1]];
    console.log('file: ', secondFile);

    // convert JSZipObject to Blob pdf
    const secondBlob = await secondFile.async('blob');
    const pdfFile = new File([secondBlob], secondFile.name, { type: 'application/pdf' });
    console.log('pdfFile: ', pdfFile);


    console.log("files: ", files)

    this.setState({ waitingForFileUpload: true });
    const certFile: any[] = [pdfFile];
    const { credentialID, sections } = this.state;

    const hashedUploadFileArray: any = [];

    try {

      for (let i = 0; i < certFile.length; i++) {
        // const certContent = await Verify.readUploadedFileAsText(certFile[i]);
        const credentialID= certFile[i].name.split('_');
        const {
          fileContent,
          // isMandatory,
          citizenId,
          citiSel,
          countOfDisagree,
          countOfAgree,
        } = await extractData(certFile[i]);

        SumOfDisagree += countOfDisagree;
        SumOfAgree += countOfAgree;
        // TODO: Combine the content with the component type (mandatory or not)
        // Then hash
        // Problem: How to know whether the component is mandatory or optional
        // Idea: generate 2 combinations (0 + content) and (1 + content)
        // hash and try to find it in the receipt

        //  let hashedCertThesis = '0x' + SHA256((citizenId as unknown as string) + citiSel + (fileContent as string)).toString();

        const hashedCertThesis = '0x' + SHA256(credentialID[0] as string + citiSel + (fileContent as string)).toString();
        hashedUploadFileArray.push(hashedCertThesis);
      }
    } catch (e) {
      this.setState({
        waitingForFileUpload: false,
      });
      return;
    }

    const sectionsHash = sections.map((section) => section.hash);
    console.log('sectionsHash: ', sectionsHash);

    console.log('hashedUploadFileArray: ', hashedUploadFileArray);
    const validHashValues = hashedUploadFileArray.filter(
      (hash) => sectionsHash.indexOf(hash) !== -1,
    );
    
    if (validHashValues.length !== sectionsHash.length) {
      this.setState({
        currentStep: 0,
      });
      this.state.steps[0].status = 'error';
      this.forceUpdate();
      openNotificationWithIcon(
        'warning',
        'Invalid digital opinion',
        <p>Please upload the correct digital opinion(s)</p>,
      );
    } else {
      this.state.steps[1].status = 'process';
      this.setState({
        waitingForFileUpload: false,
        hashedUploadFileArray: validHashValues,
        currentStep: 1,
        certFile,
      });
      this.forceUpdate();
      openNotificationWithIcon(
        'success',
        'Valid digital opinion',
        <p>Your digital opinion(s) hash match with the receipt</p>,
      );
    }
  };

  getInstituteInfo = async (receiptObject) => {
    console.log('receiptObject ne - kiem tra cho nay', receiptObject);
    const { web3 } = this.state;
    const MyContract = new web3.eth.Contract(
      abi,
      receiptObject.contractAddress, // get contract address to find MTroot in contract
    );
    console.log('!!! getInstituteInfo - MyContract: ', MyContract);

    const instituteInfo = await getInstituteInfo(MyContract);

    return instituteInfo;
  };


  getTransactionReceipt = async (receiptObject) => {
    const { web3 } = this.state;
    try {
      const transactionReceipt = await web3.eth.getTransactionReceipt(receiptObject.transactionHash);
      console.log('!!! getInstituteInfo - getTransactionReceipt: ', transactionReceipt);
      return transactionReceipt;
    } catch (error) {
      console.log('!!! getInstituteInfo - getTransactionReceipt - error: ', error);
    }
 
  };


  getContractAddress = async (receiptObject) => {
    console.log('receiptObject ne - kiem tra cho nay', receiptObject);
    const { web3 } = this.state;
    const MyContract = new web3.eth.Contract(
      abi,
      receiptObject.contractAddress, // get contract address to find MTroot in contract
    );
    const instituteInfo = await getInstituteInfo(MyContract);
    console.log('getInstituteInfo - kiem tra cho nay: ', instituteInfo)
    return instituteInfo;
  };


  getIssuedDate = async (receiptObject) => {
    const { web3 } = this.state;
    // TODO
    const transaction = await web3.eth.getTransaction(
      receiptObject.transactionHash,
    );
    const block = await web3.eth.getBlock(transaction.blockNumber);
    console.log('getIssuedDate - Block', block);
    const date = new Date(block.timestamp * 1000);
    console.log('getIssuedDate - DATE', date);
    return date;
  };

  getYearOfGraduation = async (receiptObject) => {
    const { web3 } = this.state;
    // TODO
    const transaction = await web3.eth.getTransaction(
      receiptObject.transactionHash,
    );
    const block = await web3.eth.getBlock(transaction.blockNumber);
    console.log('getYearOfGraduation - Block', block);
    const year = 0;
    return year;
  };


  verifySection = async (section: ISection, totalOpinions: number, MyContract: any) => {
    const verifyWithMT = await verify(
      MyContract,
      totalOpinions,
      section.proof,
      section.hash,
      section.mandatory || 0,
      section.citizenId || 0,
      section.citiSel,
      section.countOfDisagree,
      section.countOfAgree
    );
    console.log('verifyWithMT: ', verifyWithMT)
    return verifyWithMT;
  };

  verifyAllSections = async () => {
    const { receipt, sections, web3 } = this.state;
    const contractAddress = receipt.contractAddress;
    const MyContract = new web3.eth.Contract(abi, contractAddress);

    for (let i = 0; i < sections.length; i++) {
      sections[i].proof.forEach(p => {
        delete p['0']
      })
      const verifyResult = await this.verifySection(sections[i], receipt.totalOpinions, MyContract);
      console.log('verifyResult: ', verifyResult);
      if (!verifyResult) return false;
    }
    return true;
  };

  verifyReceiptAuditableData = async (receiptObject) => {
    const { receipt, web3 } = this.state;
    const receiptContractAddress = receiptObject.contractAddress;
    const MyContract = new web3.eth.Contract(abi, receiptContractAddress);
    let result;
    try {
      result = await validateReceipt(MyContract, receiptObject);
      if (!result) {
        this.state.steps[0].status = 'error';
        this.forceUpdate();
        openNotificationWithIcon(
          'error',
          'Invalid receipt',
          <p>Wrong auditable data.</p>,
        );
        console.log("Wrong auditable data");
      }
    } catch (error) {
      this.state.steps[0].status = 'error';
      this.forceUpdate();
      openNotificationWithIcon(
        'error',
        'Invalid receipt',
        <p>Invalid receipt. Please check again</p>,
      );
      console.log("Invalid receipt. Transaction and contract address are not match");
    }
    return result;
  }

  verifyCert = async () => {
    const { receipt, web3, sections } = this.state;
    const MyContract = new web3.eth.Contract(abi, receipt.contractAddress);
    const mainCertificate = sections.find(
      (section) => section.mandatory === true,
    );
    const hashedCert = mainCertificate?.hash;
    console.log('mainCertificate: ', mainCertificate);
    console.log('hashedCert: ', hashedCert);

    if (await this.verifyAllSections()) {
      this.setState({
        currentStep: 2,
      });
      this.state.steps[2].status = 'process';
      this.forceUpdate();
      const resultWithRevocation = await verifyWithRevocationList(
        hashedCert,
        MyContract,
      );
      if (resultWithRevocation[0]) {
        this.setState({
          currentStep: 3,
          renderFireWork: true,
        });
        setTimeout(() => {
          this.setState({
            renderFireWork: false,
          });
        }, 2000);
        this.state.steps[3].status = 'finish';
        this.forceUpdate();

        openNotificationWithIcon(
          'success',
          'Congratulations',
          'Your opinion is valid without being tampered',
        );
        openNotificationWithIcon(
          'info',
          'Note',
          <div>
            Please check the public key of the institute with qualified CA.
            Please click{' '}
            <Tag color="blue" onClick={() => this.drawer.current.showDrawer()}>
              View info
            </Tag>{' '}
            button for more information
          </div>,
        );
      } else {
        // error revoke
        this.setState({
          currentStep: 2,
        });
        this.state.steps[2].status = 'error';
        this.forceUpdate();
        openNotificationWithIcon(
          'error',
          'Revoked certificate',
          <p>
            The opinion is currently being revoked. Please contact the
            issuer for more information.{' '}
            <b>Revocation reason: {resultWithRevocation[1]}</b>
          </p>,
        );
      }
    } else {
      this.state.steps[1].status = 'error';
      this.forceUpdate();
      openNotificationWithIcon(
        'error',
        'Invalid certificate',
        'The opinion is not valid. Please check again',
      );
    }
  };

  componentDidUpdate(prevProps, prevState) {
    if (prevState.currentStep !== this.state.currentStep) {
      console.log('Current Step:', this.state.currentStep);
    }
  }

  getBarChartData = async () => {
    return [
      { type: 'Agree', value: 10 },
      { type: 'Disagree', value: 100 },
    ];
  };

  render() {
    const {
      fileType,
      currentFileType,
      currentStep,
      steps,
      instituteInfo,
      issuedDate,
      renderFireWork,
    } = this.state;



    return (
      <div style={{ display: 'grid' }}>
        {renderFireWork && (
          <div className="fireworkContainer">
            <Lottie
              options={{
                animationData: JSON.parse(JSON.stringify(firework)),
              }}
            />
          </div>
        )}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '20px',
            flexDirection: 'row',
          }}
        >
          <Popconfirm
            title="Are you sure to restart the verification process?"
            onConfirm={() => {
              this.setState({
                ...initialState,
              });
            }}
            onCancel={() => null}
            okText="Yes"
            cancelText="Cancel"
          >
            <h1>
              <a href=".">Verifier section</a>
            </h1>
          </Popconfirm>
        </div>

        <div
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            display: 'flex',
          }}
        >
          <Dropzone
            ref={this.dropzone}
            onDrop={this.onDrop}
            onFileDialogCancel={this.onCancel}
            accept={
              fileType === 'receipt' ? '.json' : '.pdf,.doc,.docs,images/*'
            }
            className="dropzone"
          >
            <Animated
              animationIn="wobble"
              animationOut={'none' as any}
              isVisible
            >
              <SafetyCertificateOutlined
                style={{
                  fontSize: '70px',
                  color: COLOR.yellow,
                  marginBottom: '20px',
                }}
                className="App-intro"
              />
            </Animated>
            <p>
              Drop your{' '}
              <span style={{ fontWeight: 'bold', color: COLOR.blue }}>
                {currentFileType}
              </span>{' '}
              here or click to select
            </p>
          </Dropzone>
        </div>
        {currentStep === 1 && (
          <Button type="primary" onClick={this.verifyCert}>
            <ScanOutlined
              style={{ display: 'inline-block', verticalAlign: 'middle' }}
            />
            Verify Certificate
          </Button>
        )}
        {currentStep >= 0 && (
          <div>
            <div style={{ textAlign: 'left', margin: '20px 0' }}>
              <Steps
                current={currentStep}
                status={steps[currentStep].status}
                progressDot
              >
                {steps.map((step) => (
                  <Step
                    title={step.message}
                    key={step.message}
                    description={step.description}
                  />
                ))}
              </Steps>
            </div>

            {currentStep > 0 && (
              <CustomDrawer
                ref={this.drawer}
                instituteInfo={this.state.instituteInfo}
                issuedDate={this.state.issuedDate}
                files={this.state.certFile}
              />
            )}

            {/*{ (*/}
            {/*  <Column*/}
            {/*    data={this.getBarChartData()}*/}
            {/*    xField="type"*/}
            {/*    yField="value"*/}
            {/*    label={{*/}
            {/*      position: 'middle',*/}
            {/*      style: {*/}
            {/*        fill: '#FFFFFF',*/}
            {/*        opacity: 0.6,*/}
            {/*      },*/}
            {/*    }}*/}
            {/*    xAxis={{*/}
            {/*      label: {*/}
            {/*        autoHide: true,*/}
            {/*        autoRotate: false,*/}
            {/*      },*/}
            {/*    }}*/}
            {/*    meta={{*/}
            {/*      type: { alias: 'Type' },*/}
            {/*      value: { alias: 'Count' },*/}
            {/*    }}*/}
            {/*  />*/}
            {/*)}*/}


          </div>
        )}

        {this.state.waitingForFileUpload && <span>Uploading file...</span>}
      </div>
    );
  }
}

export default Verify;
