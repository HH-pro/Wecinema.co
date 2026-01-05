import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { HypemodeGallery } from "../components";
import { MdForwardToInbox } from "react-icons/md";
import { Layout } from "../components";
import { getRequest } from "../api";
import { decodeToken } from "../utilities/helperfFunction";
import Modal from 'react-modal';
import axios from 'axios';
import { getDatabase, ref, push, serverTimestamp } from 'firebase/database'

// ✅ Environment variable se API URL - automatic switch hoga
const API_BASE_URL = process.env.REACT_APP_API_URL || "https://wecinema-co.onrender.com";

// Debugging ke liye (optional)
console.log("Current API Base URL:", API_BASE_URL);
console.log("Environment:", process.env.NODE_ENV);

const GenrePage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [user, setUser] = useState<any>({});
  const [userHasPaid, setUserHasPaid] = useState(false);
  const [showPaidUsersModal, setShowPaidUsersModal] = useState(false);
  const [paidUsers, setPaidUsers] = useState<any[]>([]);
  const navigate = useNavigate();

  const token = localStorage.getItem("token") || null;
  let userId: string | null = null;
  let username: string | null = null;

  if (token) {
    const tokenData = decodeToken(token);
    userId = tokenData?.userId || tokenData?.id || null;
    username = tokenData?.username || null;
  }

  useEffect(() => {
    if (!userId) {
      console.error('User ID is not defined.');
      return;
    }

    const fetchData = async () => {
      try {
        const result = await getRequest(`/user/${userId}`, setLoading);
        setUser(result);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    const checkUserPaymentStatus = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/user/payment-status/${userId}`);
        const { hasPaid } = response.data;
        setUserHasPaid(hasPaid);
      } catch (error) {
        console.error('Error fetching user payment status:', error);
      }
    };

    const fetchPaidUsers = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/user/paid-users`);
        const users = response.data;
        const filteredUsers = users.filter((paidUser: any) => paidUser._id !== userId);
        setPaidUsers(filteredUsers);
      } catch (error) {
        console.error('Error fetching paid users:', error);
      }
    };

    fetchData();
    checkUserPaymentStatus();
    fetchPaidUsers();
  }, [userId]);

  const handleCloseModal = () => {
    setShowPaidUsersModal(false);
    navigate('/hypemodeprofile');
  };

  const handleOpenPaidUsersModal = () => {
    setShowPaidUsersModal(true);
  };

  return (
    <Layout expand={false} hasHeader={true}>
      <div style={{ position: 'fixed', top: '100px', right: '20px', zIndex: 999 }}>
        <button onClick={handleOpenPaidUsersModal} style={{
          padding: '5px 12px',
          background: '#f1c40f',
          color: '#fff',
          border: 'none',
          borderRadius: '',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}>
          <MdForwardToInbox size="40" />
        </button>
      </div>

      <Modal
        isOpen={showPaidUsersModal && userHasPaid}
        onRequestClose={handleCloseModal}
        contentLabel="Paid Users"
        style={{
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
          },
          content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            background: '#f9f9f9',
            color: '#000',
            padding: '20px',
            borderRadius: '10px',
            border: 'none',
            maxWidth: '80%',
            maxHeight: '80%',
            overflow: 'auto',
          },
        }}
      >
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {paidUsers.map((paidUser) => (
            <li key={paidUser._id} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <Link to={`/user/${paidUser._id}`}>
                <img src={paidUser.avatar} alt={`${paidUser.username}'s avatar`} style={{ width: '30px', height: '30px', borderRadius: '50%', marginRight: '10px' }} />
              </Link>
              <span style={{ fontWeight: 'bold' }}>{paidUser.username}</span>
            </li>
          ))}
        </ul>
        <button onClick={handleCloseModal} style={{ marginTop: '20px', padding: '10px 20px', background: '#f1c40f', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Close
        </button>
      </Modal>

      {!userHasPaid && (
        <Modal
          isOpen={showPaidUsersModal}
          onRequestClose={handleCloseModal}
          contentLabel="Subscribe Now"
          style={{
            overlay: {
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
            },
            content: {
              top: '50%',
              left: '50%',
              right: 'auto',
              bottom: 'auto',
              marginRight: '-50%',
              transform: 'translate(-50%, -50%)',
              background: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
              color: '#fff',
              padding: '20px',
              borderRadius: '10px',
              border: 'none',
            },
          }}
        >
          <h2 style={{ marginBottom: '20px' }}>Subscribe to Access This Profile</h2>
          <p>You need to subscribe to access this profile.</p>
          <button onClick={handleCloseModal} style={{ marginTop: '20px', padding: '10px 20px', background: '#fff', color: '#000', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Close
          </button>
        </Modal>
      )}
      <HypemodeGallery title="Action" category="Action" length={5} isFirst />
      <HypemodeGallery title="Comedy" length={5} category="Comedy" />
      <HypemodeGallery title="Horror" length={5} category="Horror" />
      <HypemodeGallery title="Drama" length={5} category="Drama" />
      <HypemodeGallery title="Romance" length={5} category="Romance" />
      <HypemodeGallery title="Mystery" length={5} category="Mystery" />
      <HypemodeGallery title="Adventure" length={5} category="Adventure" />
      <HypemodeGallery title="Thriller " length={5} category="Thriller" />
    </Layout>
  );
};

export default GenrePage;