import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Tài khoản bị khóa" };

export default function AccountDisabledPage() {
  return (
    <main className="min-h-screen bg-bg-base px-4 py-10">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col items-center justify-center text-center">
        <div className="card-base w-full p-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-error">
            !
          </div>
          <h1 className="text-h2">Tài khoản đã bị vô hiệu hóa</h1>
          <p className="mt-3 text-body-sm text-text-secondary">
            Hồ sơ nhân sự của tài khoản này không còn hoạt động. Vui lòng liên hệ quản trị viên để được cấp lại quyền truy cập.
          </p>
          <form action={logout} className="mt-6">
            <Button type="submit" className="w-full">
              Đăng xuất
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
