import React from "react";
import { Modal, Form } from "antd";
import TransactionForm from "./TransactionForm";

const AddIncome = ({ isIncomeModalVisible, handleIncomeCancel, onFinish }) => {
  const [form] = Form.useForm();

  return (
    <Modal
      title="Add Income"
      open={isIncomeModalVisible}
      onCancel={handleIncomeCancel}
      footer={null}
    >
      <TransactionForm
        form={form}
        type="income"
        onFinish={(values) => {
          onFinish(values, "income");
          form.resetFields();
        }}
      />
    </Modal>
  );
};

export default AddIncome;
