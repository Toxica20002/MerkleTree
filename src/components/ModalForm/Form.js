import React, { useState } from 'react';
import { Modal, Form, Input, Alert } from 'antd';
import Dropzone from 'react-dropzone';
import { FileImageOutlined } from '@ant-design/icons';
import { COLOR } from '../../constants';

const FormItem = Form.Item;

const IssuingBatchForm = ({ issuerName, visible, onCancel, onCreate, setImageFile }) => {
  const [form] = Form.useForm();
  const [image, setImage] = useState(null);
  const [imageError, setImageError] = useState(false);

  return (
    <Modal
      visible={visible}
      title="Input this batch of certificates information"
      okText="Create"
      cancelText="Cancel"
      onCancel={onCancel}
      onOk={() => {
        form
          .validateFields()
          .then((values) => {
            if (!image) {
              setImageError(true);
              return;
            }
            form.resetFields();
            setImageError(false);
            onCreate({ ...values, image });
          })
          .catch((info) => {
            console.log('Validation Failed:', info);
          });
      }}
    >
      <Form
        form={form}
        layout="vertical"
        name="batch_info"
        initialValues={{
          modifier: 'public',
          instituteName: issuerName,
          year: 0,
          description: '',
        }}
      >
        <FormItem
          name="instituteName"
          label="Institute name"
          rules={[
            {
              required: true,
              message: 'Please input the name of the issuing institute!',
            },
          ]}
        >
          <Input />
        </FormItem>

        <FormItem name="yearOfGraduation" label="Year of Creation">
          <Input type="number" />
        </FormItem>
        <FormItem name="description" label="Description">
          <Input.TextArea />
        </FormItem>

        <FormItem name="image" label="Image">
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
              width: "100%",
            }}
          >
            <Dropzone
              onDrop={(acceptedFiles) => {
                setImage(acceptedFiles[0]);
                setImageFile(acceptedFiles[0]);
                setImageError(false);
              }}
              accept=".png, .jpg, .jpeg"
              className="dropzone"
            >
              <FileImageOutlined
                style={{
                  fontSize: '70px',
                  color: COLOR.yellow,
                  cursor: 'pointer',
                  marginBottom: '20px',
                }}
                className="App-intro"
              />
              <p>
                Drop{" "}
                <span style={{ fontWeight: "bold", color: COLOR.blue }}>
                  image file
                </span>{" "}
                here or click to select
              </p>
            </Dropzone>
            {imageError && (
              <Alert
                message="Please upload an image file."
                type="error"
                showIcon
                style={{ marginTop: '20px' }}
              />
            )}
          </div>
        </FormItem>
      </Form>
    </Modal>
  );
};

export default IssuingBatchForm;