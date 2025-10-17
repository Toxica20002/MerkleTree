import { FileTextOutlined,SearchOutlined } from '@ant-design/icons';
import {   Alert,Button, notification, Row, Select, Tag } from 'antd';
import JSZip from 'jszip';
import Lottie from 'lottie-react-web';
import {
  decodePDFRawStream,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFRawStream,
  PDFStream, PDFString,
} from 'pdf-lib';
import React, { Component } from 'react';
import { Animated } from 'react-animated-css';
import Dropzone from 'react-dropzone';
import Web3 from 'web3';
import { abi, citiSel, citizenId, COLOR, countOfAgree, countOfDisagree, totalOpinions } from '../../constants';
import { ISection } from '../../models/section.model';
import { getAllContractData } from '../../services/merkletreeUtils';
import './audit.css';
import { firework } from './firework';


const { Option } = Select;
type ReceiptInfoType = 'success' | 'info' | 'warning' | 'error';

interface IState {
  sections: ISection[];
  selectedSectionIds: string[];
  receipt: any;
  myContract: any;
  web3: any;
  result: any,
  showTable: boolean,
  renderFireWork: boolean,
  auditing: boolean,
  isButtonDisabled: boolean,
  status: string;
  hasReceiptInfo: boolean;
  receiptInfoType: ReceiptInfoType;
  receiptInfoMessage: string;

}

const openNotificationWithIcon = (type, message, description) => {
  notification[type]({
    message,
    description,
    duration: type === 'success' ? 6 : 15,
  });
};


class Audit extends Component<any, IState> {
  showReceiptAlert = (type, message) => {
    this.setState({
      hasReceiptInfo: true,
      receiptInfoType: type as ReceiptInfoType,
      receiptInfoMessage: message,
    });
  };

  private dropzone: any;
  private keysToAudit = [totalOpinions, citizenId, citiSel, countOfDisagree, countOfAgree]
  constructor(props) {
    super(props);
    this.dropzone = React.createRef();
  }

  state = {
    sections: [] as ISection[],
    // selectedSectionIds: '',
    selectedSectionIds: [],
    receipt: null as any,
    myContract: undefined,
    web3: new Web3(Web3.givenProvider || 'http://localhost:8545'),
    result: {},
    showTable: false,
    renderFireWork: false,
    auditing: false,
    isButtonDisabled: true,
    status: 'Loading...',
    hasReceiptInfo: false,
    receiptInfoMessage: '',
    receiptInfoType: 'info' as ReceiptInfoType,
  };

  inputFile: any;

  static readUploadedFileAsText = (inputFile: any) => {
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

  showSuccessNotification = () => {
    openNotificationWithIcon(
      'success',
      'Audit succesfully',
      'All selected auditable data(s) are passed',
    );
    this.setState({ renderFireWork: true }); // Use an arrow function to access this
    setTimeout(() => {
      this.setState({
        renderFireWork: false,
      });
    }, 2000);
  }

  onUpload = () => {
    this.inputFile.click();
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

  onDrop = async (files:any) => {
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

    const jsonFiles: any[] = [];
    jsonFiles.push(jsonFile);

    files = jsonFiles;

    try{
        const fileContent = (await Audit.readUploadedFileAsText(
          files[0],
        )) as string;
        const receipt = JSON.parse(fileContent as string);
        const optionalSections: any[] = []
        for (const property in receipt) {
          const value = receipt[property]
          if (!Array.isArray(value) && this.keysToAudit.indexOf(property) > -1) {
            optionalSections.push(property as any)
          }
        }
  
        // get contract
        const { web3 } = this.state;
        const MyContract = new web3.eth.Contract(
          abi,
          receipt.contractAddress, // get contract address to find MTroot in contract
        );
  
        if (optionalSections.length>0) {
          this.setState({
            sections: optionalSections,
            receipt,
            // selectedSectionIds: '',
            selectedSectionIds: [],
            myContract: MyContract
          });
          this.showReceiptAlert('success', 'Got a valid receipt');
        } else {
          openNotificationWithIcon(
            'error',
            'Invalid receipt',
            'Incorrect structure of the receipt'
          );
        }
  
    }
    catch(error){
      this.showReceiptAlert('error', 'Invalid file type of receipt.\n' + error);
      this.setState({
        sections: []});
    }
  };

  onChangeSelect = (sectionSelected) => {
    this.setState({
      selectedSectionIds: sectionSelected,
      isButtonDisabled: sectionSelected.length <= 0,
      // TODO: Reset Passed/Failed Status when remove/select auditable data(s) -  9 Nov 2023
      showTable: sectionSelected.length > 0,
      status: 'Loading...',
      result: {},
    })
  };

  setData = (data: any) => {
    const { result } = this.state
    Object.assign(result, data)
    this.setState({ result })
  }


  onAudit = async () => {
    this.setState({ auditing: true, isButtonDisabled: true });
    let passedCount = 0;
    const { selectedSectionIds, receipt, myContract } = this.state;

    const contractResults = await getAllContractData(myContract, selectedSectionIds)
    for (const key of Object.keys(contractResults)) {
      const result = contractResults[key];
      const receiptData = receipt[key];
      if (result == receipt[key]) {
        this.setData({ [key]: result });
        passedCount++;
      } else {
        this.setData({ [key]: result });
        openNotificationWithIcon(
          'error',
          'Audit Failed',
          'Receipt auditable data ' + key + ': ' + receiptData + ' is not correct.'
        );
      }
    }

    if (passedCount === selectedSectionIds.length) {
      this.setState({ auditing: false, isButtonDisabled: false });
      this.showSuccessNotification();
    }
    this.setState({ showTable: true, auditing: false, isButtonDisabled: true });
  }


  render() {
    const { sections, result, selectedSectionIds, receipt, showTable, auditing, isButtonDisabled, renderFireWork, hasReceiptInfo, receiptInfoMessage, receiptInfoType, } = this.state;
    return (
      <div style={{ display: 'grid' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ color: '#1890ff' }}>Auditor section</h1>
        </div>
        <React.Fragment>
          <div
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              display: 'flex',
            }}
          >
            {renderFireWork && (
              <div className="fireworkContainer">
                <Lottie
                  options={{
                    animationData: JSON.parse(JSON.stringify(firework)),
                  }}
                />
              </div>
            )}
            <Dropzone
             // ref={this.dropzone}
              onDrop={this.onDrop}
              accept={'.pdf'}
              className="dropzone"
            >
              <Animated
                animationIn="wobble"
                animationOut={'none' as any}
                isVisible
              >
                <FileTextOutlined
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
                  receipt
                </span>{' '}
                here or click to select
              </p>
            </Dropzone>

          </div>
          <div className="todoListMain">
          {hasReceiptInfo && (
            <div style={{marginBottom: '10px'}}>
                      <Alert
                        message={receiptInfoMessage}
                        type={receiptInfoType}
                      />             
            </div>
)}
            {sections.length > 0 && (
              <Row>
                <Tag color="blue" style={{ marginBottom: '20px' }}>
                  Found {sections.length} auditable data(s) in your receipt
                </Tag>
              </Row>
            )}
            <Row>
              <span>
                <p>Select auditable data(s)</p>
              </span>
            </Row>
            <Select
              mode="multiple"
              value={selectedSectionIds}
              onChange={this.onChangeSelect}
              style={{ width: 400 }}
            >
              {sections.map((section, index) => (
                <Option key={index} value={section}>
                  {section}
                </Option>
              ))}
            </Select>
            <Button type="primary" size="large" onClick={this.onAudit} disabled={auditing || isButtonDisabled}> <SearchOutlined
              style={{
                display: "inline-block",
                verticalAlign: "middle",
              }}
            />
              Start auditing
            </Button>
          </div>

          {showTable && (
            <div className="myTable" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div className="myresult" style={{ textAlign: 'center' }}>
                <table style={{ borderCollapse: 'collapse', border: '1px solid #d9d1d1' }}>
                  <thead>
                    <tr>
                      <th className='columnName' style={{ border: '1px solid #d9d1d1' }}> Auditable Data(s) </th>
                      <th className='columnName' style={{ border: '1px solid #d9d1d1' }}> Auditable Merkle Tree Root's Value </th>
                      <th className='columnName' style={{ border: '1px solid #d9d1d1' }}> Receipt's Value</th>
                      <th className='columnName' style={{ border: '1px solid #d9d1d1' }}> Auditing Status </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSectionIds.map(section => {
                      if (result[section] !== undefined && receipt[section] !== undefined) {
                        this.state.status = String(result[section]) === String(receipt[section]) ? 'Passed' : 'Failed';
                      }
                      return (
                        <tr key={section}>
                          <td style={{ border: '1px solid #d9d1d1' }}>{section}</td>
                          <td style={{ border: '1px solid #d9d1d1' }}>{result[section]}</td>
                          <td style={{ border: '1px solid #d9d1d1' }}>{receipt[section]}</td>
                          <td style={{ border: '1px solid #d9d1d1', color: this.state.status === 'Failed' ? 'red' : this.state.status === "Passed" ? 'green' : 'black' }}>{this.state.status}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </React.Fragment>
      </div>
    );
  }
}
export default Audit;
