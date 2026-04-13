"use client";

import { createContext, useEffect, useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import toast, { Toaster } from "react-hot-toast";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { IoClose } from "react-icons/io5";
import ProductZoom from "./components/ProductZoom";
import ProductDetailsComponent from "./components/ProductDetails";
import { getData } from "./utils/api";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { SettingsProvider } from "./context/SettingsContext";

const MyContext = createContext();

function LegacyProviders({ children }) {
  const [openProductDetailsModal, setOpenProductDetailsModal] = useState(false);
  const [maxWidth] = useState("lg");
  const [fullWidth] = useState(true);
  const [isLogin, setIsLogin] = useState(false);
  const [userData, setUserData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [openCartPanel, setOpenCartPanel] = useState(false);

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
  };

  const toggleCartPanel = (newOpen) => () => {
    setOpenCartPanel(newOpen);
  };

  const openAlertBox = (status, msg) => {
    if (status === "success") toast.success(msg);
    if (status === "error") toast.error(msg);
  };

  const values = {
    setOpenProductDetailsModal,
    setOpenCartPanel,
    toggleCartPanel,
    openCartPanel,
    openAlertBox,
    isLogin,
    setIsLogin,
    setUserData,
    userData,
    authLoading,
  };

  return (
    <>
      <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
        <MyContext.Provider value={values}>
          <SettingsProvider>
            <CartProvider enabled={isLogin}>
              <WishlistProvider enabled={isLogin}>{children}</WishlistProvider>
            </CartProvider>
          </SettingsProvider>
        </MyContext.Provider>
      </GoogleOAuthProvider>

      <Toaster />

      <Dialog
        open={openProductDetailsModal}
        fullWidth={fullWidth}
        maxWidth={maxWidth}
        onClose={handleCloseProductDetailsModal}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        className="productDetailModal"
      >
        <DialogContent>
          <div className="relative flex items-center w-full productDetailModalContainer">
            <Button
              className="!w-[40px] !min-w-[40px] !h-[40px] !rounded-full !text-[#000] !font-bold !absolute top-[15px] right-[15px] !bg-[#f1f1f1]"
              onClick={handleCloseProductDetailsModal}
            >
              <IoClose className="text-[20px]" />
            </Button>
            <div className="col1 w-[40%] px-3">
              <ProductZoom />
            </div>
            <div className="col2 w-[60%] px-8 pr-16 py-8 productContent">
              <ProductDetailsComponent />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default LegacyProviders;
export { MyContext };
