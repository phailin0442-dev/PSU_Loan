import AppNavbar from "./AppNavbar";

function AppLayout({ setPage, children }) {
    return (
        <div className="min-h-screen bg-[#eef5ff] text-[#07116f]">
            <AppNavbar setPage={setPage} />
            {children}
        </div>
    );
}

export default AppLayout;
