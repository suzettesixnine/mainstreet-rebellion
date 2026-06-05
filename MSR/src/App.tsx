import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import Navbar from "@/components/Navbar";
import Index from "./pages/Index";
import Browse from "./pages/Browse";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProfileSetup from "./pages/ProfileSetup";
import Profile from "./pages/Profile";
import CreateListing from "./pages/CreateListing";
import Pricing from "./pages/Pricing";
import ListingDetail from "./pages/ListingDetail";
import Messages from "./pages/Messages";
import Conversation from "./pages/Conversation";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import Discussions from "./pages/Discussions";
import DiscussionDetail from "./pages/DiscussionDetail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Neighborhood from "./pages/Neighborhood";
import Storefront from "./pages/Storefront";
import SellerProfile from "./pages/SellerProfile";
import InviteLanding from "./pages/InviteLanding";
import AdminVerifications from "./pages/AdminVerifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profile/setup" element={<ProfileSetup />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/listings/new" element={<CreateListing />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/listings/:id" element={<ListingDetail />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:id" element={<Conversation />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/neighborhood" element={<Neighborhood />} />
            <Route path="/neighborhood/:zip" element={<Neighborhood />} />
            <Route path="/events" element={<Events />} />
            <Route path="/discussions" element={<Discussions />} />
            <Route path="/discussions/:id" element={<DiscussionDetail />} />
            <Route path="/store/:slug" element={<Storefront />} />
            <Route path="/users/:id" element={<SellerProfile />} />
            <Route path="/invite" element={<InviteLanding />} />
            <Route path="/admin/verifications" element={<AdminVerifications />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
