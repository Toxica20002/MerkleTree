import React from 'react';
import PropTypes from 'prop-types';

import IssuingBatchForm from './Form';

class IssuingBatchInfoModalForm extends React.Component {
  state = {
    visible: false,
  };

  showModal = () => {
    this.setState({ visible: true });
  };

  handleCancel = () => {
    this.setState({ visible: false });
  };

  onCreate = values => {
    console.log('Received values of form: ', values);
    this.props.createContractTrigger(values);
    this.setState({ visible: false });
  }

 

  render() {
    const { visible } = this.state;
    const { imageFile, setImageFile } = this.props;
    return (
      <div>
        <IssuingBatchForm
          issuerName = {this.props.issuerName}
          visible={visible}
          onCancel={this.handleCancel}
          onCreate={this.onCreate}
          image={imageFile}
          setImageFile={setImageFile}
        />
      </div>
    );
  }
}

IssuingBatchInfoModalForm.propTypes = {
  createContractTrigger: PropTypes.func,
  imageFile: PropTypes.object,
  setImageFile: PropTypes.func,
};

export default IssuingBatchInfoModalForm;
