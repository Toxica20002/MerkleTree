import { Col, Row } from 'antd';
import { FileProtectOutlined,FileSearchOutlined,SolutionOutlined,FileDoneOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import React from 'react';

import './Intro.css';

export const Intro = props => (
  <Row >
    <Col span={6}>
      <div
        style={{
          backgroundColor: '#ff4242',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'row',
          cursor: 'pointer',
        }}
        onClick={() => {
          props.onClick('verifier');
        }}
        onKeyDown={() => { }}
        role="button"
        tabIndex={0}
      >
        <FileProtectOutlined
          style={{ fontSize: '70px', color: 'white' }}
          className="App-intro"
        />
        <p style={{ color: 'white', fontSize: '20px', marginTop: '15px' }}>
          Verifier
        </p>
      </div>
    </Col>
    <Col span={6}>
      <div
        style={{
          backgroundColor: '#1890ff',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'row',
          cursor: 'pointer',
        }}
        onClick={() => {
          props.onClick('issuer');
        }}
        onKeyDown={() => { }}
        role="button"
        tabIndex={0}
      >
        <SolutionOutlined

          style={{ fontSize: '70px', color: 'white' }}
          className="App-intro"
        />
        <p style={{ color: 'white', fontSize: '20px', marginTop: '15px', paddingLeft:'5px', }}>
           Issuer
        </p>
      </div>
    </Col>
    <Col span={6}>
      <div
        style={{
          backgroundColor: '#4CAF50',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'row',
          cursor: 'pointer',
        }}
        onClick={() => {
          props.onClick('select');
        }}
        onKeyDown={() => { }}
        role="button"
        tabIndex={0}
      >
        <FileSearchOutlined
          style={{ fontSize: '70px', color: 'white' }}
          className="App-intro"
        />
        <p style={{ color: 'white', fontSize: '20px', marginTop: '15px' }}>
          Selective Disclosure
        </p>
      </div>
    </Col>
    <Col span={6}>
      <div
        style={{
          backgroundColor: '#673AB7',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'row',
          cursor: 'pointer',
        }}
        onClick={() => {
          props.onClick('audit');
        }}
        onKeyDown={() => { }}
        role="button"
        tabIndex={0}
      >
        <FileDoneOutlined
          style={{ fontSize: '70px', color: 'white' }}
          className="App-intro"
        />
        <p style={{ color: 'white', fontSize: '20px', marginTop: '15px' }}>
          Auditor
        </p>
      </div>
    </Col>
  </Row>
);

Intro.propTypes = {
  onClick: PropTypes.func.isRequired,
};
