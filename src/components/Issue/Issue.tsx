import {
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  SettingOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Col,
  Collapse,
  notification,
  Row,
  Spin,
  Tabs,
  Tag,
} from 'antd';
import SHA256 from 'crypto-js/sha256';
import JSZip from 'jszip';
import * as moment from 'moment';
import forge from 'node-forge';
import React from 'react';
import { Animated } from 'react-animated-css';
import Dropzone from 'react-dropzone';
import Web3 from 'web3';
import {
  abi,
  COLOR,
  REQUIRED_SECTION_MARK,
} from '../../constants';
import { downloadFile } from '../../libs/download';
import { revokeCertificate } from '../../libs/smartContractUtils';
import { createMT } from '../../libs/verifymt';
import { ISection } from '../../models/section.model';
import { extractData, getFileContent } from '../../services/extractData';
import IssuingBatchInfoModalForm from '../ModalForm/ModalForm';
import Pdf from '../Pdf/Pdf';
import RevokeForm from '../RevokeForm/RevokeForm';
import './Issue.css';

import fs from 'fs';
import { PDFDocument } from 'pdf-lib';

const { TabPane } = Tabs;
const openNotificationWithIcon = (type, message, description) => {
  notification[type]({
    message,
    description,
    duration: type === 'success' ? 6 : 15,
  });
};

interface Props {
  MyContract: any;
  contractAddress: string;
  account: string;
  getContractAddressList: string[];
  transactionHash: string;
  
  createContract: (
    MTRoot,
    instituteName?,
    yearOfGraduation?,
    description?,
   // numbMandatory?,
    // numbOptional?,
    citizenId?,
    citiSel?,
    totalOpinions?,
    countOfDisagree?,
    countOfAgree?,
  ) => void;
}

interface IState {
  hashedCertArray: any[];
  waitingForFileUpload: boolean;
  fileNames: string[];
  fileList: any;
  proofs: any;
  disableButton: boolean;
  MTRoot: string;
  yearOfGraduation: number;
  description: string;
  // NumbMandatory: number;
  // NumbOptional: number;
  selectedAddress: string;
  reason: string;
  createdContractAddress: string[];
  sectionName: string;
  issuerSetting: any;
  issuerCertCommonName: string;
  hasIssuerSettingInfo: boolean;
  hasRevokeSettingInfo: boolean;
  issuerSettingInfoMessage: string;
  revokeSettingInfoMessage: string;
  issuerSettingInfoType: 'success' | 'info' | 'warning' | 'error';
  revokeSettingInfoType: 'success' | 'info' | 'warning' | 'error';
  hasUploadedFileInfo: boolean;
  uploadedFileInfoMessage: string;
  uploadedFileInfoType: 'success' | 'info' | 'warning' | 'error';
  sections: ISection[];
  receipt: any;
  mandatorySection: any;
  revocationStep: number;
  disableRevocationButton: boolean;
  revokeFileName: string;
  revokingCert: any;
  revokingCertHash: string;
  credentialID: string;
  citizenId: number;
  citiSel: number;
  totalOpinions: number;
  countOfDisagree: number;
  countOfAgree: number;
  imageFile: any;
}

class Issue extends React.Component<Props, IState> {
  showIssuerSettingAlert = (type, message) => {
    this.setState({
      hasIssuerSettingInfo: true,
      issuerSettingInfoType: type,
      issuerSettingInfoMessage: message,
    });
  };

  setImageFile = (file: any) => {
    this.setState({ imageFile: file });
    console.log('Image File: ', file);
  };

  showRevokeSettingAlert = (type, message) => {
    this.setState({
      hasRevokeSettingInfo: true,
      revokeSettingInfoType: type,
      revokeSettingInfoMessage: message,
    });
  };


  showUploadedFileAlert = (type, message) => {
    this.setState({
      hasUploadedFileInfo: true,
      uploadedFileInfoType: type,
      uploadedFileInfoMessage: message,
    });
  };

  closeUploadedFileAlert = () => {
    this.setState({ hasUploadedFileInfo: false });
  };

  private modal: any;
  private dropzone: any;
  constructor(props) {
    super(props);
    this.dropzone = React.createRef();
    this.state = {
      hashedCertArray: [],
      waitingForFileUpload: false,
      fileNames: [],
      fileList: [],
      proofs: [],
      disableButton: true,
      MTRoot: '',
      // NumbMandatory: 0,
      // NumbOptional: 0,
      yearOfGraduation: 0,
      description: '',
      selectedAddress: '',
      reason: '',
      createdContractAddress: [],
      sectionName: '',
      issuerSetting: undefined,
      issuerCertCommonName: '',

      issuerSettingInfoMessage: '',
      issuerSettingInfoType: 'info',
      hasIssuerSettingInfo: false,


      revokeSettingInfoMessage: '',
      revokeSettingInfoType: 'info',
      hasRevokeSettingInfo: false,

      hasUploadedFileInfo: false,
      uploadedFileInfoMessage: '',
      uploadedFileInfoType: 'info',

      sections: [],
      receipt: undefined,
      mandatorySection: undefined,
      revocationStep: 1,
      disableRevocationButton: true,
      revokeFileName: '',
      revokingCert: undefined,
      revokingCertHash: '',
      credentialID: '',
      citizenId: 0,
      citiSel: 0,
      totalOpinions: 0,
      countOfDisagree: 0,
      countOfAgree: 0,
    };
    this.modal = React.createRef();
  }

  uploadIssuerSetting = async (files: any) => {
    try {
      const fileContent = await getFileContent(files[0]);

      const setting = JSON.parse(fileContent as string);
      // check json format

      if (
        !(
          setting.hasOwnProperty('ethereumAccount') &&
          setting.hasOwnProperty('ethereumAccountSignature') &&
          setting.hasOwnProperty('issuerCertificateChain')
        )
      ) {
        this.showIssuerSettingAlert(
          'error',
          "Invalid format for a issuer's setting.",
        );
      } else {
        const cert = forge.pki.certificateFromPem(
          setting.issuerCertificateChain,
        );
        console.log("Issue Opinion.sol Check Forge Opinion.sol: ",cert);

        const isDateValid = () => {
          const now = new Date();
          const notBefore = new Date(cert.validity.notBefore) ;
          const notAfter = new Date(cert.validity.notAfter);
          return now >= notBefore && now <= notAfter 
        }

        const issuerCN = cert.subject?.getField('CN')?.value;
        this.setState({
          issuerSetting: setting,
          issuerCertCommonName: issuerCN,
        });

        const issuerAccount = setting.ethereumAccount;
        const { account } = this.props;
        // TODO: Comment out for the final version - Prevent the school from issuing cert if the Issuer Settings is expired 
        // if(!isDateValid()) { 
        //   this.showIssuerSettingAlert('warning', 'Your issuer\'s setting is expired');
        //   return;
        // }

        if (issuerAccount.toUpperCase() !== account.toUpperCase()) {
          this.showIssuerSettingAlert(
            'warning',
            'Got a valid issuer setting. But the Ethereum account does not match with the connected account in Metamask',
          );
          return;
        }

          this.showIssuerSettingAlert('success', 'Got a valid issuer setting');
      }
    } catch (error) {
      this.showIssuerSettingAlert('error', 'Invalid issuer setting.\n' + error);
    }
  };

  uploadFile = async (zipFiles: any) => {
    this.closeUploadedFileAlert();
    const verifyFileFormat = (filename: string) => {
      const filenameParts = filename.split('_');
      if (filenameParts.length !== 2) {
        return false;
      }
      console.log("filenameParts: ",filenameParts);
     // this.setState(credentialID = filenameParts[0].toString());
      return true;
    };

    // extract data from zip file
    // Extract data from zip file
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(zipFiles[0]);
    const files: File[] = [];

    for (const filename in zipContent.files) {
      if (!zipContent.files[filename].dir) {
        const fileContent = await zipContent.files[filename].async('blob');
        files.push(new File([fileContent], filename));
      }
    }
    const fileList = files;

    // Validate file name format
    const validFileNames = files.filter((file) => !verifyFileFormat(file.name));
    if (validFileNames.length > 0) {
      this.showUploadedFileAlert('error', 'Invalid filename format.');
      return false;
    }

    const fileNamesArray: string[] = [];
    this.setState({
      waitingForFileUpload: true,
      hashedCertArray: [],
      fileList,
    });
    for (let i = 0; i < fileList.length; i++) {
      // TODO: read student ID from json
      // TODO: Define and check file format
      // take file name for student ID. Ex: ITITIU14076
      fileNamesArray.push(fileList[i].name);
    }

    this.setState({
      fileNames: fileNamesArray,
    });

    // Uploads will push to the file input's `.files` array. Get the last uploaded file.
    // Hash files and store the results
    try {
      for (let i = 0; i < fileList.length; i++) {
        // TODO: concatenate ID of the credential (Unique for each credential) and hash
        const {
          fileContent,
          isMandatory,
          citizenId,
          citiSel,
          countOfDisagree,
          countOfAgree,
        } = await extractData(fileList[i]);
        const modifiedhashedCertArray = this.state.hashedCertArray;
        let componentValue: string = '';
        const credentialID= fileList[i].name.split('_');
        // citizenId as unknown as string;
        console.log('This is Thesis mode');
        // componentValue = (citizenId as unknown as string) + citiSel + (fileContent as string); //Dùng Tenfile để xác nhận credentialID và hash chung vs CitiSel +fileContent
        componentValue = credentialID[0] as string  + citiSel + (fileContent as string);

        const hashOfComponent = '0x' + SHA256(componentValue).toString(); // Hash
        console.log('ISSUE - hashOfComponent: ', hashOfComponent);
        modifiedhashedCertArray.push({
          hash: hashOfComponent,
          isMandatory,
          name: fileList[i].name,
          // auditable Data
          citizenId,
          citiSel,
          countOfDisagree,
          countOfAgree,
        });
        console.log('ISSUE - modifiedhashedCertArray: ', modifiedhashedCertArray);

        this.setState({
          hashedCertArray: modifiedhashedCertArray,
        });
      }
    } catch (e) {
      console.log(e);
      this.setState({
        waitingForFileUpload: false,
      });
    }

    console.time('Creating Auditable MerkleTree');

    // Build a auditable merkle tree for all certs
    const data = createMT(this.state.hashedCertArray);

    console.timeEnd('Creating Auditable MerkleTree');
    console.log('Auditable MerkleTree Data:', data);

    this.setState({
      disableButton: false,
      ...(data as any),
    });

    // Log receipt object to console. For Test purpose
    this.generateReceipt();

    this.setState({
      waitingForFileUpload: false,
    });

    this.modal.current.showModal();
  };

  getProof = (filename) => {
    const indexOfFile = this.state.fileNames.indexOf(filename);
    // lấy index của filename trên array fileNames
    // dùng index đó để lấy trên array proofs
    return this.state.proofs[indexOfFile];
  };

  getFile = (filename) => {
    const indexOfFile = this.state.fileNames.indexOf(filename);
    return this.state.fileList[indexOfFile];
  };

  // Get hash value from the computed hashedArray
  getHash = (filename) => {
    const indexOfFile = this.state.fileNames.indexOf(filename);
    return this.state.hashedCertArray[indexOfFile].hash;
  };

  getPropertyForReceipt = (filename: string, property: Object) => {
    const stateName = Object.keys(property)[0];
    const indexOfFile = this.state.fileNames.indexOf(filename);
    return this.state.hashedCertArray[indexOfFile][stateName];
  };

  createContractTrigger = (values: any) => {
    const {
      MTRoot,
      // NumbMandatory,
      // NumbOptional,
      citizenId,
      citiSel,
      totalOpinions,
      countOfDisagree,
      countOfAgree,
    } = this.state;
    console.log('createContractTrigger - values: ',values);
    const { instituteName,yearOfGraduation, description } = values;
    console.log('createContractTrigger - instituteName: ' + instituteName + ' Year: ' + yearOfGraduation + ' Description: ' + description);
    // ToDo: create state => copy value
    // TODO: await has no effect. Because: ??

    this.props.createContract(
      MTRoot,
      '0x' + SHA256(instituteName),
      yearOfGraduation, // Quan FIX
      description, // Quan FIX
      // NumbMandatory,
      // NumbOptional,
      citizenId,
      citiSel,
      totalOpinions,
      countOfDisagree,
      countOfAgree,
    );
  };

  generateReceipt = async (isDownload: boolean = false) => {
    const { contractAddress } = this.props;
  
    const {
      fileNames,
      issuerSetting,
      // NumbMandatory,
      // NumbOptional,
      citizenId,
      citiSel,
      totalOpinions,
      countOfDisagree,
      countOfAgree,
    } = this.state;
    const dic = {};
    const studentReceipts: any[] = [];

    for (let i = 0; i < fileNames.length; i++) {
      const result = fileNames[i].split('_');
      if (result[0] in dic) {
        dic[result[0]].push(result[1]);
      } else {
        dic[result[0]] = [result[1]];
      }
    }
    console.log('dic', dic);
    // 2. forEach Group, kiểm tra các phần tử đúng format không, tạo receipt
    for (const credentialID in dic) {
      let studentReceipt: any = {
        version: 'ConsensusPro 1.0',
        issuedOn: new Date(),
        issuedBy:this.state.issuerCertCommonName,
        transactionHash: this.props.transactionHash,
        contractAddress,
        credentialID,
        totalOpinions,
        countOfDisagree,
        countOfAgree,
      };

      studentReceipt = {
        ...studentReceipt,
        sections: [] as ISection[],
        issuer: issuerSetting,
      };

      for (let i = 0; i < dic[credentialID].length; i++) {
        const fullFileName = credentialID + '_' + dic[credentialID][i];
        const sectionName = dic[credentialID][i].split('.')[0];
        const isMandatory = fullFileName.indexOf(REQUIRED_SECTION_MARK) > -1;

        studentReceipt.sections.push({
          id: studentReceipt.sections.length + 1,
          citizenId: this.getPropertyForReceipt(fullFileName, { citizenId }),
          name: sectionName,
          mandatory: isMandatory,
          proof: this.getProof(fullFileName),
          hash: this.getHash(fullFileName),
          

          citiSel: this.getPropertyForReceipt(fullFileName, { citiSel }),
          totalOpinions: this.getPropertyForReceipt(fullFileName, { totalOpinions, }),
          countOfDisagree: this.getPropertyForReceipt(fullFileName, {countOfDisagree,}),
          countOfAgree: this.getPropertyForReceipt(fullFileName, {countOfAgree,}),
        });

        studentReceipts.push(studentReceipt);
      }
    }
    console.log('studentReceipts ne', studentReceipts);

    if (isDownload) {
      const zip = new JSZip();
      const timestamp = new Date().toISOString();
      for (const credentialID in dic) {
        const folder = zip.folder(credentialID);
        const studentReceipt = studentReceipts.find(
          (receipt) => receipt.credentialID === credentialID,
        );

        const receipt = new Blob([JSON.stringify(studentReceipt)], {
          type: 'json',
        });


        // if (folder != null) {
        //   folder.file(`${credentialID}_blockchainReceipt.json`, receipt);
        //   // add image
        //   if (this.state.imageFile) {
        //     folder.file('logo.png', this.state.imageFile);
        //     console.log('(check) Image File: ', this.state.imageFile);
        //   }
        // }


        for (let i = 0; i < dic[credentialID].length; i++) {
          async function attachJsonToPDF(pdfBytes, jsonContent, pdfContent, fullFileName, imageFile) {
            // Load the existing PDF
            const pdfDoc = await PDFDocument.load(pdfBytes);
            await PDFDocument.load(pdfContent);
// Create a Blob from the JSON content
            const receiptBlob = new Blob([JSON.stringify(jsonContent)], {
              type: 'application/json',
            });

            const pdfContentBlob = new Blob([pdfContent], {
              type: 'application/pdf',
            });

            const imageBlob = new Blob([imageFile], { type: 'image/png' });

            // Read the Blob as an ArrayBuffer
            const arrayBuffer = await receiptBlob.arrayBuffer();
            const arrayBufferContent = await pdfContentBlob.arrayBuffer();
            const imageArrayBuffer = await imageBlob.arrayBuffer();

            const attachZip = new JSZip();
            attachZip.file('receipt.json', receiptBlob);
            attachZip.file(fullFileName, pdfContentBlob);

            const zipArrayBlob = await attachZip.generateAsync({ type: 'blob' });
            const zipArrayBuffer = await zipArrayBlob.arrayBuffer();
            
            // convert ArrayBuffer to Buffer
            const imageBuffer = Buffer.from(imageArrayBuffer);
            const zipBuffer = Buffer.from(zipArrayBuffer);

            const combinedBuffer = Buffer.concat([imageBuffer, zipBuffer]);


            // Attach the JSON blob to the PDF
            // await pdfDoc.attach(arrayBuffer, 'receipt.json');
            // await pdfDoc.attach(arrayBufferContent, fullFileName);

            // convert Buffer to ArrayBuffer
            const combineArrayBuffer = combinedBuffer.buffer;

            await pdfDoc.attach(combineArrayBuffer, 'logo.png');
            // Save the PDF with the attached JSON
            const modifiedPdfBytes = await pdfDoc.save();
            return modifiedPdfBytes;
          }



          const fullFileName = credentialID + '_' + dic[credentialID][i];
          const file = this.getFile(fullFileName);
          const pdfBytes = new Uint8Array(await file.arrayBuffer());
          const modifiedPdfBytes = await attachJsonToPDF(pdfBytes, studentReceipts[i], pdfBytes, fullFileName, this.state.imageFile);
          const pdfBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
          if (folder != null) {
            folder.file(fullFileName, pdfBlob);
          }

        }


      }

      zip.generateAsync({ type: 'blob' }).then((content: any) => {
        downloadFile(content, `opinionBatch-${timestamp}.zip`, 'zip');
      });
    }
  };

  uploadRevokingReceipt = async (files:any) => {
try{
  if (files.length > 0) {
    const fileContent = await getFileContent(files[0]);
    const receiptObject = JSON.parse(fileContent as string);
    const credentialID = receiptObject.credentialID;
    const revokeFileName = files[0].name.split('.')[0];
    const { sections } = receiptObject;
    const sectionNames = [] as any[];

    for (let p = 0; p < sections.length; p++) {
      if(sections[p].name.includes('(R)'))
      sectionNames.push(sections[p].name);
    }

    const mandatorySection = receiptObject.sections.filter(
      (section) => section.mandatory === true,
    );
    console.log('mandatorySection: ',mandatorySection);
    this.setState({
      receipt: receiptObject,
      mandatorySection: mandatorySection[0],
      revocationStep: 2,
      revokeFileName,
      credentialID,
    });
    openNotificationWithIcon(
      'info',
      'Note',
      <div>
        Please upload your{' '}
        <ol>
          {sectionNames.map((sectionName) => (
            <li key={sectionName}>{sectionName}</li>
          ))}{' '}
        </ol>
        to begin the revoking process. You can either click this Button{' '}
        <Tag
          color="blue"
          onClick={(e) => {
            this.dropzone.current.onClick(e);
            notification.destroy();
          }}
        >
          Upload certificate
        </Tag>
        or drag your file to the dropzone
      </div>,
    );
  }
  }
catch(error){
  this.showRevokeSettingAlert('error', 'Invalid receipt.\n' + error);
}


  };

  uploadRevokingCert = async (files:any) => {
    try {
      this.setState({ waitingForFileUpload: true });
      const revokingCert = files[0];
      const { fileContent, citizenId, citiSel } = await extractData(revokingCert);
      const credentialID = this.state.credentialID;
      console.log('This is Thesis mode');
      const componentValue = (citizenId as unknown as string) + citiSel + (fileContent as string);
  
      const revokingCertHash = '0x' + SHA256(componentValue).toString(); // Hash
      this.setState({
        revokingCert,
        revokingCertHash,
        waitingForFileUpload: false,
        revocationStep: 3,
        disableRevocationButton: false,
      });
    }
    catch(error){
      this.showRevokeSettingAlert('error', 'Invalid cert.\n' + error);
    }
  };

  uploadForRevoking = async () => {
    this.setState({ waitingForFileUpload: true });

    const selectedAddress = this.state.receipt.contractAddress;
    const hashedCert = this.state.mandatorySection.hash;
    const revokingHash = this.state.revokingCertHash;
    const { account } = this.props;
    const { reason } = this.state;
    const web3 = new Web3(Web3.givenProvider || 'http://localhost:8545');
    const MyContract = new web3.eth.Contract(abi, selectedAddress);
    if (hashedCert === revokingHash) {
      try {
        await revokeCertificate(
          hashedCert,
          reason,
          account,
          MyContract,
          selectedAddress,
        );
        openNotificationWithIcon(
          'success',
          'Success!',
          <p>The opinion has been revoked successfully!</p>,
        );
      } catch (error) {
        console.error(error);
        this.setState({ waitingForFileUpload: false });
        openNotificationWithIcon(
          'error',
          'Cannot submit the transaction',
          <p>Please check the transaction log in Metamask.</p>,
        );
      }
    } else {
      openNotificationWithIcon(
        'error',
        'Invalid receipt or Digital Opinion',
        <p>Please check the receipt and corresponding opinion again.</p>,
      );
    }
    this.setState({ waitingForFileUpload: false });
  };

  render() {
    const uploadedFileDescription = `Supported filename format:
    CredentialID_SectionName[${REQUIRED_SECTION_MARK}].(pdf)`;
    const {
      disableButton,
      receipt,
      mandatorySection,
      revocationStep,
      disableRevocationButton,
      revokeFileName,
    } = this.state;
    const { Panel } = Collapse;

    const {
      hasIssuerSettingInfo,
      issuerSettingInfoMessage,
      issuerSettingInfoType,
      hasRevokeSettingInfo,
      revokeSettingInfoMessage,
      revokeSettingInfoType
    } = this.state;
    const {
      hasUploadedFileInfo,
      uploadedFileInfoMessage,
      uploadedFileInfoType,
    } = this.state;

    const { contractAddress } = this.props;

    const toDisableCertDropzone = !(issuerSettingInfoType === 'success');
    const toDisableButton =
      !contractAddress || disableButton || toDisableCertDropzone;
      let formattedDate;
      if (receipt && receipt.issuedOn) {
         formattedDate = moment.default(receipt.issuedOn).format('DD/MM/YYYY h:mm:ss A');
      }

    return (
      <div style={{ display: 'grid' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#1890ff' }}>Issuer section</h1>
        </div>

        <Tabs
          defaultActiveKey="1"
          tabBarStyle={{ display: 'flex', justifyContent: 'flex-start' }}
        >
          <TabPane
            tab={
              <span>
                <CloudUploadOutlined
                  style={{ display: 'inline-block', verticalAlign: 'middle' }}
                />
                Issue opinions
              </span>
            }
            key="1"
          >
            <Spin spinning={this.state.waitingForFileUpload} size="large">
              <Row>
                <Col span={12}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexDirection: 'column',
                      width: '100%',
                    }}
                  >
                    <Dropzone
                      onDrop={this.uploadIssuerSetting}
                      // accept=".json,.pdf"
                      accept=".json"
                      className="dropzone"
                    >
                      <Animated
                        animationIn="wobble"
                        animationOut={'none' as any}
                        isVisible
                      >
                        <SettingOutlined
                          style={{
                            fontSize: '70px',
                            color: COLOR.yellow,
                            cursor: 'pointer',
                            marginBottom: '20px',
                          }}
                          className="App-intro"
                        />
                      </Animated>
                      <p>
                        Drop your{' '}
                        <span style={{ fontWeight: 'bold', color: COLOR.blue }}>
                          issuer's setting
                        </span>{' '}
                        here or click to select
                      </p>
                    </Dropzone>
                    {hasIssuerSettingInfo && (
                      <Alert
                        message={issuerSettingInfoMessage}
                        type={issuerSettingInfoType}
                      />
                    )}
                  </div>
                </Col>
                <Col span={12}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexDirection: 'column',
                      width: '100%',
                      visibility: toDisableCertDropzone ? 'hidden' : 'visible',
                    }}
                  >
                    <Dropzone
                      onDrop={this.uploadFile}
                      accept=".zip"
                      multiple
                      className="dropzone"
                    >
                      <Animated
                        animationIn="wobble"
                        animationOut={'none' as any}
                        isVisible
                      >
                        <FilePdfOutlined
                          style={{
                            fontSize: '70px',
                            color: COLOR.yellow,
                            cursor: 'pointer',
                            marginBottom: '20px',
                          }}
                          className="App-intro"
                        />
                      </Animated>
                      <p>
                        Drop your{' '}
                        <span style={{ fontWeight: 'bold', color: COLOR.blue }}>
                          opinions
                        </span>{' '}
                        here or click to select
                      </p>
                    </Dropzone>
                    <Tag color="blue" style={{ marginBottom: '50px' }}>
                      {this.state.fileNames.length} file(s) selected
                    </Tag>
                    {hasUploadedFileInfo && (
                      <Alert
                        message={uploadedFileInfoMessage}
                        type={uploadedFileInfoType}
                        description={uploadedFileDescription}
                        banner
                      />
                    )}
                  </div>
                </Col>
              </Row>
              <Row>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'column',
                    width: '100%',
                  }}
                  className="App"
                >
                  <Button
                    size="large"
                    type="primary"
                    disabled={toDisableButton}
                    // block
                    onClick={() => {
                      this.generateReceipt(true);
                    }}
                  >
                    <DownloadOutlined
                      style={{
                        display: 'inline-block',
                        verticalAlign: 'middle',
                      }}
                    />
                    Download blockchain receipt(s)
                  </Button>

                  <IssuingBatchInfoModalForm
                    ref={this.modal}
                    createContractTrigger={this.createContractTrigger}
                    issuerName={this.state.issuerCertCommonName}
                    imageFile={this.state.imageFile}
                    setImageFile={this.setImageFile}
                  />
                </div>
              </Row>
            </Spin>
          </TabPane>
          {/*<TabPane*/}
          {/*  tab={*/}
          {/*    <span>*/}
          {/*      <DeleteOutlined*/}
          {/*        style={{ display: "inline-block", verticalAlign: "middle" }}*/}
          {/*      />*/}
          {/*      Revoke certificate*/}
          {/*    </span>*/}
          {/*  }*/}
          {/*  key="2"*/}
          {/*>*/}
          {/*  <Spin spinning={this.state.waitingForFileUpload} size="large">*/}
          {/*    <Row>*/}
          {/*    <Col span={12} style={{paddingBottom: revocationStep <2? "72px":0}}>*/}
          {/*        <div*/}
          {/*          style={{*/}
          {/*            display: "flex",*/}
          {/*            justifyContent: "center",*/}
          {/*            alignItems: "center",*/}
          {/*            flexDirection: "column",*/}
          {/*            width: "100%",*/}
          {/*          }}*/}
          {/*        >*/}
          {/*          <Dropzone*/}
          {/*            ref={this.dropzone}*/}
          {/*            onDrop={this.uploadRevokingReceipt}*/}
          {/*            accept=".json"*/}
          {/*            className="dropzone"*/}
          {/*          >*/}
          {/*            <Animated*/}
          {/*              animationIn="wobble"*/}
          {/*              animationOut={"none" as any}*/}
          {/*              isVisible*/}
          {/*            >*/}
          {/*              <FileTextOutlined*/}
          {/*                style={{*/}
          {/*                  fontSize: "70px",*/}
          {/*                  color: COLOR.yellow,*/}
          {/*                  cursor: "pointer",*/}
          {/*                  marginBottom: "20px",*/}
          {/*                }}*/}
          {/*                className="App-intro"*/}
          {/*              />*/}
          {/*            </Animated>*/}
          {/*            <p>*/}
          {/*              Drop{" "}*/}
          {/*              <span style={{ fontWeight: "bold", color: COLOR.blue }}>*/}
          {/*                student's receipt*/}
          {/*              </span>{" "}*/}
          {/*              here or click to select*/}
          {/*            </p>*/}
          {/*          </Dropzone>*/}
          {/*          {hasRevokeSettingInfo && (*/}
          {/*            <Alert*/}
          {/*              message={revokeSettingInfoMessage}*/}
          {/*              type={revokeSettingInfoType}*/}
          {/*            />*/}
          {/*          )}*/}
          {/*          {revocationStep >= 2 && (*/}
          {/*            <Tag color="blue" style={{ marginBottom: "50px" }}>*/}
          {/*              {revokeFileName} is selected to be revoked.*/}
          {/*            </Tag>*/}
          {/*          )}*/}
          {/*        </div>*/}
          {/*      </Col>*/}


          {/*      {revocationStep >= 2 && (*/}
          {/*        <Col span={12}>*/}
          {/*          <div*/}
          {/*            style={{*/}
          {/*              display: "flex",*/}
          {/*              justifyContent: "center",*/}
          {/*              alignItems: "center",*/}
          {/*              flexDirection: "column",*/}
          {/*              width: "100%",*/}
          {/*            }}*/}
          {/*          >*/}
          {/*            <Dropzone*/}
          {/*              onDrop={this.uploadRevokingCert}*/}
          {/*              accept=".pdf"*/}
          {/*              className="dropzone"*/}
          {/*            >*/}
          {/*              <Animated*/}
          {/*                animationIn="wobble"*/}
          {/*                animationOut={"none" as any}*/}
          {/*                isVisible*/}
          {/*              >*/}
          {/*                <FilePdfOutlined*/}
          {/*                  style={{*/}
          {/*                    fontSize: "70px",*/}
          {/*                    color: COLOR.yellow,*/}
          {/*                    cursor: "pointer",*/}
          {/*                    marginBottom: "20px",*/}
          {/*                  }}*/}
          {/*                  className="App-intro"*/}
          {/*                />*/}
          {/*              </Animated>*/}
          {/*              <p>*/}
          {/*                Drop the{" "}*/}
          {/*                <span*/}
          {/*                  style={{ fontWeight: "bold", color: COLOR.blue }}*/}
          {/*                >*/}
          {/*                  opinion to be revoked*/}
          {/*                </span>{" "}*/}
          {/*                here or click to select*/}
          {/*              </p>*/}
          {/*            </Dropzone>*/}
          {/*            {this.state.revokingCert && (*/}
          {/*              <Tag color="blue" style={{ marginBottom: "50px" }}>*/}
          {/*                {this.state.revokingCert.name} is selected to be*/}
          {/*                revoked.*/}
          {/*              </Tag>*/}
          {/*            )}*/}
          {/*          </div>*/}
          {/*        </Col>*/}
          {/*      )}*/}
          {/*    </Row>*/}
          {/*     {revocationStep >= 2 && (*/}
          {/*      <Row>*/}
          {/*        <div style={{ marginBottom: "10px" }}>*/}
          {/*          <Collapse accordion>*/}
          {/*            <Panel*/}
          {/*              header="Receipt Information"*/}
          {/*              key="Revoke_receiptInfo"*/}
          {/*            >*/}
          {/*              <b>Issued Date: </b>*/}
          {/*              <p>{formattedDate}</p>*/}
          {/*              <b>Contract Address:</b>*/}
          {/*              <p>{receipt.contractAddress}</p>*/}
          {/*              <b>Mandatory Section Hash: </b>*/}
          {/*              <p>{mandatorySection.hash}</p>*/}
          {/*            </Panel>*/}
          {/*          </Collapse>*/}
          {/*        </div>*/}
          {/*      </Row>*/}
          {/*    )} */}
          {/*     {revocationStep === 3 && (*/}
          {/*      <Row>*/}
          {/*        <div style={{ marginBottom: "10px" }}>*/}
          {/*          <Collapse accordion>*/}
          {/*            <Panel header="Digital Opinion" key="Revoke_cert">*/}
          {/*              <Pdf file={this.state.revokingCert} />*/}
          {/*            </Panel>*/}
          {/*          </Collapse>*/}
          {/*        </div>*/}
          {/*      </Row>*/}
          {/*    )} */}
          {/*    {revocationStep >= 3 && (*/}
          {/*      <Row>*/}
          {/*        <div*/}
          {/*          style={{*/}
          {/*            display: "flex",*/}
          {/*            justifyContent: "center",*/}
          {/*            alignItems: "center",*/}
          {/*            flexDirection: "column",*/}
          {/*            width: "100%",*/}
          {/*          }}*/}
          {/*          className="App"*/}
          {/*        >*/}
          {/*          <RevokeForm*/}
          {/*            onChange={(reason) => {*/}
          {/*              this.setState({*/}
          {/*                reason,*/}
          {/*              });*/}
          {/*            }}*/}
          {/*          />*/}
          {/*        </div>*/}
          {/*      </Row>*/}
          {/*    )}*/}
          {/*    <Row>*/}
          {/*      <div*/}
          {/*        style={{*/}
          {/*          display: "flex",*/}
          {/*          justifyContent: "center",*/}
          {/*          alignItems: "center",*/}
          {/*          flexDirection: "column",*/}
          {/*          width: "100%",*/}
          {/*        }}*/}
          {/*        className="App"*/}
          {/*      >*/}
          {/*        <Button*/}
          {/*          size="large"*/}
          {/*          type="primary"*/}
          {/*          disabled={disableRevocationButton}*/}
          {/*          onClick={() => {*/}
          {/*            this.uploadForRevoking();*/}
          {/*          }}*/}
          {/*        >*/}
          {/*          <DeleteOutlined*/}
          {/*            style={{*/}
          {/*              display: "inline-block",*/}
          {/*              verticalAlign: "middle",*/}
          {/*            }}*/}
          {/*          />*/}
          {/*          Revoke the certificate.*/}
          {/*        </Button>*/}
          {/*      </div>*/}
          {/*    </Row>*/}
          {/*  </Spin>*/}
          {/*</TabPane>*/}
        </Tabs>
      </div>
    );
  }
}

export default Issue;
