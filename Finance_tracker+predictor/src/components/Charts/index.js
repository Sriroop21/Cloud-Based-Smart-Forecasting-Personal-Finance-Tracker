import React, { useState } from "react";
import ReactApexChart from "react-apexcharts";
import "./styles.css";

const ChartComponent = ({ transactions }) => {
  const [chartType, setChartType] = useState("line");

  const toggleChartType = () => {
    setChartType((prev) => (prev === "line" ? "bar" : "line"));
  };

  // Parse dates properly and sort chronologically
  const parseDate = (dateStr) => {
    // Handle DD-MM-YYYY format (like 01-04-2025)
    if (typeof dateStr === "string" && dateStr.includes("-")) {
      const [day, month, year] = dateStr.split("-");
      return new Date(`${year}-${month}-${day}`);
    }
    // Fallback to standard date parsing
    return new Date(dateStr);
  };

  // Sort transactions by date (chronologically)
  const sortedTransactions = [...transactions].sort(
    (a, b) => parseDate(a.date) - parseDate(b.date)
  );

  // Format dates for display
  const formatDisplayDate = (date) => {
    if (!date) return "Invalid Date";

    const parsedDate = parseDate(date);
    // Check if date is valid before formatting
    if (isNaN(parsedDate.getTime())) {
      return "Invalid Date";
    }
    // Format date as YYYY-MM-DD for display
    return parsedDate.toISOString().split("T")[0];
  };

  // Calculate running balance
  const calculateRunningBalance = () => {
    let balance = 0;
    const balances = [];
    const formattedDates = [];

    sortedTransactions.forEach((transaction) => {
      const date = formatDisplayDate(transaction.date);
      if (date !== "Invalid Date") {
        // For income, add to balance; for expense, subtract from balance
        if (transaction.type === "income") {
          balance += transaction.amount;
        } else {
          balance -= transaction.amount;
        }
        balances.push(balance);
        formattedDates.push(date);
      }
    });

    return { balances, dates: formattedDates };
  };

  // Get running balance data
  const { balances, dates } = calculateRunningBalance();

  const chartOptions = {
    chart: {
      id: "transaction-chart",
      toolbar: {
        show: false, // Hide the toolbar completely
      },
      zoom: {
        enabled: false, // Disable zoom functionality
      },
    },
    xaxis: {
      categories: dates,
      title: {
        text: "Date",
        style: {
          color: "#4B5563",
          fontWeight: 600,
        },
      },
      labels: {
        rotate: -45,
        style: {
          colors: "#6B7280",
        },
        formatter: function (value) {
          // Safety check - if value is undefined or not a string
          if (!value || typeof value !== "string") {
            return "Invalid";
          }

          // Handle "Invalid Date" string
          if (value === "Invalid Date") return value;

          // Try to format the date
          try {
            const parts = value.split("-");
            if (parts.length !== 3) return value;

            const [year, month, day] = parts;
            return `${day}/${month}/${year.slice(2)}`;
          } catch (error) {
            // If any error in formatting, return the original value
            return value;
          }
        },
      },
    },
    yaxis: {
      title: {
        text: "Running Balance",
        style: {
          color: "#4B5563",
          fontWeight: 600,
        },
      },
      labels: {
        style: {
          colors: "#6B7280",
        },
        formatter: function (value) {
          return value.toLocaleString();
        },
      },
    },
    stroke: {
      curve: "smooth",
      width: chartType === "line" ? 3 : 0,
    },
    plotOptions: {
      bar: {
        columnWidth: "50%",
        borderRadius: 6,
      },
    },
    markers: {
      size: chartType === "line" ? 4 : 0,
      colors: ["#fff"],
      strokeColors: "var(--primary-purple)",
      strokeWidth: 2,
    },
    colors: ["var(--primary-purple)"],
    tooltip: {
      theme: "light",
      y: {
        formatter: function (value) {
          return value.toLocaleString();
        },
      },
      x: {
        formatter: function (value) {
          // Safety check for undefined/null values
          if (value === undefined || value === null) {
            return "Unknown date";
          }

          // If the value is an index, retrieve the actual date
          if (typeof value === "number" && dates[value]) {
            const dateStr = dates[value];

            if (dateStr === "Invalid Date") return dateStr;

            try {
              const parts = dateStr.split("-");
              if (parts.length !== 3) return dateStr;

              const [year, month, day] = parts;
              return `${day}/${month}/${year}`;
            } catch (error) {
              return dateStr;
            }
          }
          return value;
        },
      },
    },
    grid: {
      borderColor: "#E5E7EB",
      row: {
        colors: ["transparent", "transparent"],
      },
    },
    // Add annotations for zero line
    annotations: {
      yaxis: [
        {
          y: 0,
          strokeDashArray: 0,
          borderColor: "#999",
          borderWidth: 1,
          opacity: 0.3,
          label: {
            borderColor: "#999",
            style: {
              color: "#fff",
              background: "#999",
            },
            text: "Zero Balance",
          },
        },
      ],
    },
  };

  const chartSeries = [
    {
      name: "Running Balance",
      data: balances,
    },
  ];

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h2 className="chart-title">
          Running Balance ({chartType === "bar" ? "Bar" : "Line"} Chart)
        </h2>
        <button className="toggle-button" onClick={toggleChartType}>
          Switch to {chartType === "line" ? "Bar" : "Line"} Chart
        </button>
      </div>
      <ReactApexChart
        options={chartOptions}
        series={chartSeries}
        type={chartType}
        height={350}
      />
    </div>
  );
};

export default ChartComponent;
