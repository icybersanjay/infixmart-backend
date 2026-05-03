"use client";

import { createContext, useEffect, useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import toast, { Toaster } from "react-hot-toast";
import Modal from "./components/ui/Modal";
import { IoClose } from "react-icons/io5";
import ProductZoom from "./components/ProductZoom";
import ProductDetailsComponent from "./components/ProductDetails";
import MembershipModal from "./components/MembershipModal";
import { getData } from "./utils/api";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { SettingsProvider } from "./context/SettingsContext";
import { RecentlyViewedProvider } from "./context/RecentlyViewedContext";
import { CompareProvider } from "./context/CompareContext";

const MyContext = createContext();

function LegacyProviders({ children }) {
  const [openProductDetailsModal, setOpenProductDetailsModal] = useState(false);
  const [selectedQuickViewProduct, setSelectedQuickViewProduct] = useState(null);
  const [maxWidth] = useState("lg");
  const [fullWidth] = useState(true);
  const [isLogin, setIsLogin] = useState(false);
  const [userData, setUserData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [openCartPanel, setOpenCartPanel] = useState(false);
  const [showMembershipModal, setShowMembershipModal] = useState(false);

  useEffect(() => {
    getData("/api/user/user-details")
      .then((res) => {
        if (res && res.error === false) {
          setUserData(res.user);
          setIsLogin(true);
        } else {
          setIsLogin(false);
          setUserData(null);
        }
      })
      .catch(() => {
        setIsLogin(false);
        setUserData(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const handleCloseProductDetailsModal = () => {
    setOpenProductDetailsModal(false);
    setSelectedQuickViewProduct(null);
  };

  const openProductDetailsModalFor = (product) => {
    setSelectedQuickViewProduct(product || null);
    setOpenProductDetailsModal(true);
  };

  const toggleCartPanel = (newOpen) => () => {
    setOpenCartPanel(newOpen);
  };

  const openMembershipModal = () => setShowMembershipModal(true);
  const closeMembershipModal = () => setShowMembershipModal(false);

  const refreshUserData = () => {
    getData("/api/user/user-details")
      .then((res) => {
        if (res && res.error === false) {
          setUserData(res.user);
          setIsLogin(true);
        }
      })
      .catch(() => {});
  };

  const openAlertBox = (status, msg) => {
    if (status === "success") toast.success(msg);
    if (status === "error") toast.error(msg);
  };

  const values = {
    setOpenProductDetailsModal,
    openProductDetailsModalFor,
    selectedQuickViewProduct,
    setSelectedQuickViewProduct,
    setOpenCartPanel,
    toggleCartPanel,
    openCartPanel,
    openAlertBox,
    isLogin,
    setIsLogin,
    setUserData,
    userData,
    authLoading,
    openMembershipModal,
    closeMembershipModal,
  };

  return (
    <>
      <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
        <MyContext.Provider value={values}>
          <SettingsProvider>
            <CompareProvider>
            <CartProvider enabled={isLogin}>
              <WishlistProvider enabled={isLogin}>
                <RecentlyViewedProvider>{children}</RecentlyViewedProvider>
                <Modal
                  open={openProductDetailsModal}
                  onClose={handleCloseProductDetailsModal}
                  maxWidth="4xl"
                  ariaLabel="Product details"
                  contentClassName="productDetailModal"
                >
                  <div className="p-4">
                    <div className="relative flex items-center w-full productDetailModalContainer">
                      <button
                        type="button"
                        className="w-[40px] h-[40px] inline-flex items-center justify-center rounded-full text-black font-bold absolute top-[15px] right-[15px] bg-[#f1f1f1] hover:bg-gray-200 transition-colors z-10"
                        onClick={handleCloseProductDetailsModal}
                        aria-label="Close"
                      >
                        <IoClose className="text-[20px]" />
                      </button>
                      <div className="col1 w-[40%] px-3">
                        <ProductZoom images={selectedQuickViewProduct?.images || []} />
                      </div>
                      <div className="col2 w-[60%] px-8 pr-16 py-8 productContent">
                        <ProductDetailsComponent product={selectedQuickViewProduct} />
                      </div>
                    </div>
                  </div>
                </Modal>
              </WishlistProvider>
            </CartProvider>
            </CompareProvider>
          </SettingsProvider>
        </MyContext.Provider>
      </GoogleOAuthProvider>

      <MembershipModal
        open={showMembershipModal}
        onClose={closeMembershipModal}
        userEmail={userData?.email}
        userName={userData?.name}
        onSuccess={refreshUserData}
      />
      <Toaster
        position="top-center"
        gutter={10}
        toastOptions={{
          duration: 3000,
          className: 'infix-toast',
          style: {
            background: '#ffffff',
            color: '#0f172a',
            fontSize: '13px',
            fontWeight: 600,
            padding: '12px 16px',
            borderRadius: '12px',
            boxShadow: '0 10px 24px rgba(15, 23, 42, 0.10), 0 4px 8px rgba(15, 23, 42, 0.04)',
            border: '1px solid rgba(15, 23, 42, 0.06)',
            maxWidth: '420px',
          },
          success: {
            iconTheme: { primary: '#00A651', secondary: '#ffffff' },
            style: {
              borderLeft: '4px solid #00A651',
              paddingLeft: '12px',
            },
          },
          error: {
            iconTheme: { primary: '#E53935', secondary: '#ffffff' },
            style: {
              borderLeft: '4px solid #E53935',
              paddingLeft: '12px',
            },
            duration: 4000,
          },
          loading: {
            iconTheme: { primary: '#1565C0', secondary: '#ffffff' },
            style: {
              borderLeft: '4px solid #1565C0',
              paddingLeft: '12px',
            },
          },
        }}
      />
    </>
  );
}

export default LegacyProviders;
export { MyContext };
