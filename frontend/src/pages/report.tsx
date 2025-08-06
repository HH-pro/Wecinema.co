import { useState } from "react";
import emailjs from "emailjs-com";
import { Layout } from "../components";


const ReportPage = () => {
  const [reportData, setReportData] = useState({
    category: "",
    details: "",
  });
  const [message, setMessage] = useState("");

  const reportCategories = [
    "Spam",
    "Harassment",
    "Misinformation",
    "Hate Speech",
    "Other",
  ];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    setReportData({ ...reportData, [e.target.name]: e.target.value });
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    const emailParams = {
      category: reportData.category,
      details: reportData.details,
      owner_email: "hamzamanzoor046@gmail.com", // Replace with your email
    };
  
    try {
      await emailjs.send(
        "service_zqol7n4", // EmailJS service ID
        "template_mdpiipr", // EmailJS template ID
        emailParams,
        "1r7HTd-O6zTnCC-J-" // EmailJS public key
      );
  
      setMessage("Report sent successfully!");
      setReportData({ category: "", details: "" });
    } catch (error) {
      setMessage("Error sending the report. Try again.");
      console.error("EmailJS Error:", error);
    }
  };
 
  return (
    <Layout expand={false} hasHeader={false}>

    <div className="max-w-lg mx-auto p-10 bg-white shadow-lg rounded-xl mt-10">
      <h2 className="text-xl font-bold mb-4">Report Content</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="font-medium">Reason for Reporting:</span>
          <select
            name="category"
            value={reportData.category}
            onChange={handleChange}
            className="w-full p-2 mt-1 border rounded"
            required
          >
            <option value="">Select a reason</option>
            {reportCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="font-medium">Additional Details:</span>
          <textarea
            name="details"
            value={reportData.details}
            onChange={handleChange}
            className="w-full p-2 mt-1 border rounded"
            rows={4}
            placeholder="Provide more information..."
          />
        </label>

        <button type="submit" className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">
          Submit Report
        </button>
      </form>

      {message && <p className="mt-4 text-center text-sm text-gray-700">{message}</p>}
    </div>
    </Layout>

  );
};

export default ReportPage;
