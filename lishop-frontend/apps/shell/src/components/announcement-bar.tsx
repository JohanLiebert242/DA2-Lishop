export function AnnouncementBar() {
  return (
    <div className="w-full bg-indigo-600 py-2 px-4 text-center">
      <p className="text-xs font-semibold text-white tracking-wide">
        🎉 Miễn phí giao hàng cho đơn từ 500.000₫ · Dùng mã{' '}
        <span className="rounded bg-white/20 px-1.5 py-0.5 font-black text-white">FREESHIP</span>
        {' '}· Flash sale hàng ngày lúc 12h &amp; 20h
      </p>
    </div>
  );
}
