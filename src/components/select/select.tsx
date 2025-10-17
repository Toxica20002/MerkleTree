import React, { Component } from 'react';
import { FileTextOutlined,DownloadOutlined } from '@ant-design/icons';
import { Row, Tag, Select, Button, notification } from 'antd';
import { Animated } from 'react-animated-css';
import Dropzone from 'react-dropzone';
import './select.css';
import { downloadFile } from '../../libs/download';
import { COLOR } from '../../constants';
import { ISection } from '../../models/section.model';

const { Option } = Select;

interface IState {
  sections: ISection[];
  selectedSectionIds: number[];
  receipt: any;
  isButtonDisabled: boolean  
}

const openNotificationWithIcon = (type, message, description) => {
  notification[type]({
    message,
    description,
    duration: type === 'success' ? 6 : 15,
  });
};

class SelectAAA extends Component<any, IState> {
  private dropzone: any;
  constructor(props) {
    super(props);
    this.dropzone = React.createRef();
  }

  state = {
    sections: [] as ISection[],
    selectedSectionIds: [] as number[],
    receipt: null as any,
    isButtonDisabled:true
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

  onUpload = () => {
    this.inputFile.click();
  };

  onDrop = async (files) => {
    if (files.length > 0) {
      let fileContent = (await SelectAAA.readUploadedFileAsText(
        files[0],
      )) as string;
      let receipt = JSON.parse(fileContent as string);
      const optionalSections = receipt.sections?.filter(
        (section) => section.mandatory === false,
      );

      if (optionalSections) {
        this.setState({
          sections: optionalSections,
          receipt,
          selectedSectionIds: [],
          isButtonDisabled:false,
        });
      } else {
        openNotificationWithIcon(
          'error',
          'Invalid receipt',
          'The structure of the receipt is incorrect',
        );
      }
    }
  };

  onChangeSelect = (sectionSelected) => {
    this.setState({ selectedSectionIds: sectionSelected});
  };

  onDownload = () => {
    const sectionSelected = this.state.selectedSectionIds;
    let receipt = this.state.receipt;
    console.log("Select - Receip data: ",receipt);
    let fullSelectedSections;
    let receiptStudentID= receipt.credentialID;
    const filename = `${receiptStudentID}_SelectiveDisclosureReceipt.json`;

    if (receipt != null && sectionSelected.length) {
      console.log(sectionSelected, ' ===> id sectionSelected ');
      fullSelectedSections = receipt.sections.filter((s: ISection) => {
        return sectionSelected.indexOf(s.id) > -1 || s.mandatory === true;
      });
    }
    else {
      fullSelectedSections = receipt.sections.filter(section => {
        return section.mandatory === true;
      });

    }
    const selectiveReceipt = this.trimInvalidSection(receipt, fullSelectedSections);
    if(!selectiveReceipt){
      return;
    }
    downloadFile(selectiveReceipt, filename, 'json');
  };

  private trimInvalidSection(receipt: any, fullSelectedSections: any) {
    if (!fullSelectedSections || !receipt) {
      return;
    }
    var clone = JSON.parse(JSON.stringify(receipt));
    clone.sections = fullSelectedSections;
    const selectiveReceipt = new Blob([JSON.stringify(clone)], {
      type: 'json',
    });
    return selectiveReceipt;
  }

  render() {
    const { sections, isButtonDisabled } = this.state;
    //TODO: clear selection
    return (
      <div style={{ display: 'grid' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ color: '#1890ff' }}>Selective disclosure section</h1>
        </div>

        <React.Fragment>
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
              accept={'.json'}
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
            {sections.length > 0 && (
              <Row>
                <Tag color="blue" style={{ marginBottom: '20px' }}>
                  Found {sections.length} optional section(s) in your receipt
                </Tag>
              </Row>
            )}
            <Row>
              <span style={{ marginTop: '30px', textAlign:'center' }}>
                Select section(s) to disclose. <p>If you leave it empty, all of non required sections will be removed.</p>
              </span>
            </Row>
            <Select
              value={this.state.selectedSectionIds}
              onChange={this.onChangeSelect}
              style={{ width: 400 }}
              mode="multiple"
            >
              {sections.map((e: any, index) => (
                <Option key={index} value={e.id}>
                  {e.name}
                </Option>
              ))}
            </Select>
            <Button type="primary" size="large" onClick={this.onDownload} disabled={isButtonDisabled}>
            <DownloadOutlined
              style={{
                display: "inline-block",
                verticalAlign: "middle",
              }}
            />
              Download your new receipt
            </Button>
          </div>
        </React.Fragment>
      </div>
    );
  }
}

export default SelectAAA;
