import React from "react";
import { Modal, Form } from "antd";
import TransactionForm from "./TransactionForm";

const AddExpense = ({
  isExpenseModalVisible,
  handleExpenseCancel,
  onFinish,
}) => {
  const [form] = Form.useForm();

  return (
    <Modal
      title="Add Expense"
      open={isExpenseModalVisible}
      onCancel={handleExpenseCancel}
      footer={null}
    >
      <TransactionForm
        form={form}
        type="expense"
        onFinish={(values) => {
          onFinish(values, "expense");
          form.resetFields();
        }}
      />
    </Modal>
  );
};

export default AddExpense;
