// WishlistPage.jsx — หน้าสัตว์ที่บันทึกไว้ (Wishlist / Favorites)

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function WishlistPage() {
  const navigate = useNavigate()

  const [รายการ, setรายการ] = useState([])

  // ฟังก์ชันลบสัตว์ออกจาก Wishlist
  function ลบออก(id) {
    setรายการ(รายการ.filter((s) => s.id !== id))
  }

  return (
    <div className="min-h-screen bg-red-50 pb-8">

      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/home')} className="text-gray-700 text-xl">←</button>
        <div>
          <h1 className="font-bold text-gray-800">สัตว์ที่บันทึกไว้</h1>
          <p className="text-gray-500 text-xs">{รายการ.length} ตัว</p>
        </div>
      </div>

      <div className="px-4 pt-4">

        {/* ถ้าไม่มีสัตว์ในรายการ */}
        {รายการ.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <div className="text-6xl mb-4">💔</div>
            <p className="text-gray-500 font-medium">ยังไม่มีสัตว์ที่บันทึกไว้</p>
            <p className="text-gray-400 text-sm mt-1">กดไอคอน ❤️ ในหน้าค้นหาเพื่อบันทึก</p>
            <button
              onClick={() => navigate('/find-pet')}
              className="mt-4 bg-green-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium"
            >
              ไปค้นหาสัตว์
            </button>
          </div>
        )}

        {/* รายการสัตว์ที่บันทึก */}
        <div className="space-y-4">
          {รายการ.map((สัตว์) => (
            <div key={สัตว์.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-4">

                {/* รูปสัตว์ */}
                <button
                  onClick={() => navigate(`/pet/${สัตว์.id}`, { state: { สัตว์ } })}
                  className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                >
                  {สัตว์.emoji}
                </button>

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800">{สัตว์.ชื่อ}</h3>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {สัตว์.สายพันธุ์} • {สัตว์.อายุ} • {สัตว์.เพศ}
                      </p>
                    </div>
                    {/* ปุ่มลบออกจาก Wishlist — วงกลมสีแดง กดเพื่อยกเลิกบันทึก */}
                    <button
                      onClick={() => ลบออก(สัตว์.id)}
                      className="w-9 h-9 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center text-lg transition-colors shrink-0"
                      title="นำออกจากรายการที่บันทึก"
                    >
                      ❤️
                    </button>
                  </div>

                  {/* Tag นิสัย */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {สัตว์.นิสัย.map((น) => (
                      <span key={น} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                        {น}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">📍 {สัตว์.สถานที่}</p>
                </div>
              </div>

              {/* ปุ่มยื่นขอรับเลี้ยง */}
              <button
                onClick={() => navigate(`/pet/${สัตว์.id}`, { state: { สัตว์ } })}
                className="mt-3 w-full bg-green-500 text-white rounded-xl py-2.5 text-sm font-medium"
              >
                ดูรายละเอียดและรับเลี้ยง
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

export default WishlistPage
