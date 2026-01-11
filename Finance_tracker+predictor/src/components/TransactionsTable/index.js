import React, { useState, useMemo, useCallback } from "react";
import { Radio, Select, Table } from "antd";
import { AiOutlineSearch } from "react-icons/ai";
import { parse, unparse } from "papaparse"; // Correct import for parse
import { toast } from "react-toastify";
import EditEditDeleteModal from "../EditDelete";
import { updateTransactionOnFirebase } from "../../hooks/updateTransaction";
import { deleteTransactionOnFirebase } from "../../hooks/deleteTransactionOnFirebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../firebase";

const TransactionsTable = ({
  transactions,
  addTransaction,
  fetchTransactions,
}) => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [user] = useAuthState(auth);

  const columns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Amount", dataIndex: "amount", key: "amount" },
    { title: "Type", dataIndex: "type", key: "type" },
    { title: "Date", dataIndex: "date", key: "date" },
  ];

  const filterTransactions = useMemo(() => {
    return transactions.filter(
      (item) =>
        item.name.toLowerCase().includes(search.toLowerCase()) &&
        item.type.includes(typeFilter)
    );
  }, [search, typeFilter, transactions]);

  const sortedTransactions = useMemo(() => {
    return filterTransactions.sort((a, b) => {
      if (sortKey === "date") return new Date(a.date) - new Date(b.date);
      if (sortKey === "amount") return a.amount - b.amount;
      return 0;
    });
  }, [filterTransactions, sortKey]);

  const exportCSV = useCallback(() => {
    const csv = unparse({
      fields: ["name", "type", "tag", "date", "amount"],
      data: transactions,
    });
    const data = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const csvURL = window.URL.createObjectURL(data);
    const tempLink = document.createElement("a");
    tempLink.href = csvURL;
    tempLink.download = "transactions.csv";
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
  }, [transactions]);

  const importCSV = useCallback(
    async (event) => {
      event.preventDefault();
      try {
        parse(event.target.files[0], {
          header: true,
          complete: async function (results) {
            for (const transaction of results.data) {
              if (isNaN(transaction.amount)) continue;
              const newTransaction = {
                ...transaction,
                amount: parseFloat(transaction.amount),
              };
              await addTransaction(newTransaction, true);
            }
            toast.success("All transactions added");
            fetchTransactions();
            event.target.value = null;
          },
        });
      } catch (err) {
        toast.error(err.message);
      }
    },
    [addTransaction, fetchTransactions]
  );

  const handleEdit = useCallback((transaction) => {
    setSelectedTransaction(transaction);
    setShowEditModal(true);
  }, []);

  const handleEditSave = useCallback(
    async (editedTransaction) => {
      await updateTransactionOnFirebase(user.uid, editedTransaction);
      setShowEditModal(false);
      fetchTransactions();
    },
    [user, fetchTransactions]
  );

  const handleDeleteSave = useCallback(
    async (editedTransaction) => {
      await deleteTransactionOnFirebase(user.uid, editedTransaction);
      setShowEditModal(false);
      fetchTransactions();
    },
    [user, fetchTransactions]
  );

  const handleEditCancel = useCallback(() => {
    setShowEditModal(false);
  }, []);

  return (
    <div className="table-box container">
      <h2>My Transactions</h2>
      <div className="search-and-filter container">
        <AiOutlineSearch className="search-icon" />
        <input
          className="search-bar"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name"
        />
        <Select
          className="search-bar select-filter"
          onChange={(value) => setTypeFilter(value)}
          value={typeFilter}
          placeholder="Filter"
          allowClear
        >
          <Select.Option value="">All</Select.Option>
          <Select.Option value="income">Income</Select.Option>
          <Select.Option value="expense">Expense</Select.Option>
        </Select>
      </div>
      <div className="import-export-sort container">
        <Radio.Group
          className="input-radio"
          onChange={(e) => setSortKey(e.target.value)}
          value={sortKey}
        >
          <Radio.Button value="">No Sort</Radio.Button>
          <Radio.Button value="date">Sort by Date</Radio.Button>
          <Radio.Button value="amount">Sort by Amount</Radio.Button>
        </Radio.Group>
        <div className="ix-button">
          <button className="btn btn-purple" onClick={exportCSV}>
            Export CSV
          </button>
          <label htmlFor="file-csv" className="btn">
            Import CSV
          </label>
          <input
            type="file"
            id="file-csv"
            accept=".csv"
            required
            onChange={importCSV}
            style={{ display: "none" }}
          />
        </div>
      </div>
      <div className="table-container">
        <Table
          dataSource={sortedTransactions}
          columns={columns}
          rowClassName="table-row-hover"
          onRow={(record) => ({
            onClick: () => handleEdit(record),
          })}
        />
        {showEditModal && selectedTransaction && (
          <EditEditDeleteModal
            transaction={selectedTransaction}
            onSave={handleEditSave}
            onDelete={handleDeleteSave}
            onCancel={handleEditCancel}
          />
        )}
      </div>
    </div>
  );
};

export default TransactionsTable;
