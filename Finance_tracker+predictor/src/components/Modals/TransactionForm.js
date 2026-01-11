import React from "react";
import { Form, Input, DatePicker, Button } from "antd";

const TransactionForm = ({ form, onFinish, type }) => {
  const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      style={{ fontWeight: 600 }}
    >
      <Form.Item
        label="Name"
        name="name"
        rules={[{ required: true, message: `Please enter the ${type} name` }]}
      >
        <Input
          type="text"
          autoFocus
          className="custome-input"
          placeholder={`${capitalizedType} Name`}
        />
      </Form.Item>

      <Form.Item
        label="Amount"
        name="amount"
        rules={[{ required: true, message: `Please enter the ${type} amount` }]}
      >
        <Input
          type="number"
          className="custome-input"
          placeholder={`${capitalizedType} Amount`}
        />
      </Form.Item>

      <Form.Item
        label="Date"
        name="date"
        rules={[{ required: true, message: `Please select the ${type} date` }]}
      >
        <DatePicker className="custome-input" format="DD-MM-YYYY" />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          className="btn reset-balance-btn"
        >
          Add {capitalizedType}
        </Button>
      </Form.Item>
    </Form>
  );
};

export default TransactionForm;
