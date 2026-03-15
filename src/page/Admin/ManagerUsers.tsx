import React, { useEffect, useState } from 'react';
import { Typography, Table, Spin, Empty, Row, Col, Tag, Button, Popconfirm, message, Space, Modal, Pagination, DatePicker, Checkbox, Input } from 'antd';
import { ManOutlined, WomanOutlined, TeamOutlined, DeleteOutlined, TrophyOutlined, FileTextOutlined, SearchOutlined, CloseOutlined, DownloadOutlined } from '@ant-design/icons';
import { Dayjs } from 'dayjs';
import Sidebar from '@/components/Sidebar';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers, deleteUser } from '@/services/features/userSlice';
import { getTopRecorders, TopRecorder, downloadRecordings } from '@/services/features/recordingSlice';
import { AppDispatch, RootState } from '@/services/store/store';

const { Title, Text } = Typography;

const ManagerUsers: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    users,
    usersLoading,
    deletingUser,
    usersTotal,
    usersPage,
    usersLimit,
    usersTotalMale,
    usersTotalFemale,
    usersTotalContributedSentences,
    usersTotalCompletedSentences,
  } = useSelector((state: RootState) => state.user);
  const [topRecorders, setTopRecorders] = useState<TopRecorder[]>([]);
  const [loadingTopRecorders, setLoadingTopRecorders] = useState(false);
  const [downloadingRecordings, setDownloadingRecordings] = useState(false);
  const [sentencesModalVisible, setSentencesModalVisible] = useState(false);
  const [selectedUserSentences, setSelectedUserSentences] = useState<Array<{ SentenceID: string; Content: string; AudioUrl?: string; Duration?: number; RecordedAt?: string }>>([]);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [sentencesModalPage, setSentencesModalPage] = useState(1);
  const [sentencesModalPageSize] = useState(10);
  const [contributedSentencesModalVisible, setContributedSentencesModalVisible] = useState(false);
  const [selectedUserContributedSentences, setSelectedUserContributedSentences] = useState<Array<{ SentenceID: string; Content: string; Status: number; CreatedAt: string }>>([]);
  const [selectedContributorName, setSelectedContributorName] = useState('');
  const [contributedSentencesModalPage, setContributedSentencesModalPage] = useState(1);
  const [contributedSentencesModalPageSize] = useState(10);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [emailFilter, setEmailFilter] = useState('');
  const [allUsersModalVisible, setAllUsersModalVisible] = useState(false);
  const [allUsersModalPage, setAllUsersModalPage] = useState(1);
  const [allUsersModalPageSize] = useState(10);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // Local state for pagination - cập nhật ngay lập tức khi user thay đổi
  const [localPageSize, setLocalPageSize] = useState(usersLimit);
  
  // Force re-render when pageSize changes
  const [refreshKey, setRefreshKey] = useState(0);

  // Handle date filter change
  const handleDateFilterChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    setDateRange(dates || [null, null]);
    const fromDate = dates?.[0] ? dates[0].toISOString() : undefined;
    const toDate = dates?.[1] ? dates[1].toISOString() : undefined;
    const email = emailFilter.trim() ? emailFilter.trim() : undefined;
    dispatch(fetchUsers({ 
      page: 1, 
      limit: usersLimit, 
      fromDate, 
      toDate,
      email,
    }));
  };

  const handleClearDateFilter = () => {
    setDateRange([null, null]);
    setEmailFilter('');
    dispatch(fetchUsers({ 
      page: 1, 
      limit: usersLimit,
    }));
  };

  const handleEmailFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmailFilter(value);
  };

  const handleApplyEmailFilter = () => {
    const fromDate = dateRange[0] ? dateRange[0].toISOString() : undefined;
    const toDate = dateRange[1] ? dateRange[1].toISOString() : undefined;
    const email = emailFilter.trim() ? emailFilter.trim() : undefined;
    dispatch(fetchUsers({ 
      page: 1, 
      limit: usersLimit, 
      fromDate, 
      toDate,
      email,
    }));
  };

  const handleClearEmailFilter = () => {
    setEmailFilter('');
    const fromDate = dateRange[0] ? dateRange[0].toISOString() : undefined;
    const toDate = dateRange[1] ? dateRange[1].toISOString() : undefined;
    dispatch(fetchUsers({ 
      page: 1, 
      limit: usersLimit, 
      fromDate, 
      toDate,
    }));
  };

  useEffect(() => {
    dispatch(fetchUsers());
    fetchTopRecorders();
  }, [dispatch]);

  // Sync localPageSize với Redux khi usersLimit thay đổi (sau khi API trả về)
  useEffect(() => {
    setLocalPageSize(usersLimit);
    setRefreshKey(prev => prev + 1);
  }, [usersLimit]);

  const fetchTopRecorders = async () => {
    setLoadingTopRecorders(true);
    try {
      const data = await getTopRecorders({ limit: 6 });
      setTopRecorders(data);
    } catch (error) {
      console.error('Failed to fetch top recorders:', error);
    } finally {
      setLoadingTopRecorders(false);
    }
  };

  const handleDownloadRecordings = async () => {
    if (selectedUserIds.length === 0) {
      message.warning('Vui lòng chọn ít nhất một người dùng');
      return;
    }

    const selectedUsers = users.filter(u => selectedUserIds.includes(u.PersonID));
    const emails = selectedUsers.map(u => u.Email);
    const fromDate = dateRange[0] ? dateRange[0].toISOString() : undefined;
    const toDate = dateRange[1] ? dateRange[1].toISOString() : undefined;

    setDownloadingRecordings(true);
    try {
      const blob = await downloadRecordings({
        emails,
        dateFrom: fromDate,
        dateTo: toDate,
        isApproved: 1,
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `recordings_${new Date().toISOString().split('T')[0]}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      message.success('Tải xuống thành công');
    } catch (error) {
      console.error('Failed to download recordings:', error);
      message.error('Tải xuống thất bại');
    } finally {
      setDownloadingRecordings(false);
    }
  };

  const handleDeleteUser = async (personId: string, userEmail: string) => {
    try {
      await dispatch(deleteUser(personId)).unwrap();
      message.success(`Đã xóa người dùng ${userEmail} thành công`);
    } catch (error) {
      const errMessage = (error as { message?: string })?.message || 'Không thể xóa người dùng';
      message.error(errMessage);
    }
  };
  const handleShowSentences = (userEmail: string, sentences?: Array<{ SentenceID: string; Content: string; AudioUrl?: string; Duration?: number; RecordedAt?: string }>) => {
    setSelectedUserName(userEmail);
    setSelectedUserSentences(sentences || []);
    setSentencesModalPage(1); // Reset về trang 1 khi mở modal
    setSentencesModalVisible(true);
  };
  const handleShowContributedSentences = (userEmail: string, sentences?: Array<{ SentenceID: string; Content: string; Status: number; CreatedAt: string }>) => {
    setSelectedContributorName(userEmail);
    setSelectedUserContributedSentences(sentences || []);
    setContributedSentencesModalPage(1); // Reset về trang 1 khi mở modal
    setContributedSentencesModalVisible(true);
  };
  const columns = [
    {
      title: <Checkbox 
        checked={selectedUserIds.length === users.length && users.length > 0}
        indeterminate={selectedUserIds.length > 0 && selectedUserIds.length < users.length}
        onChange={(e) => {
          if (e.target.checked) {
            setSelectedUserIds(users.map(u => u.PersonID));
          } else {
            setSelectedUserIds([]);
          }
        }}
      />,
      width: 50,
      key: 'checkbox',
      render: (_: unknown, record: typeof users[number]) => (
        <Checkbox 
          checked={selectedUserIds.includes(record.PersonID)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedUserIds([...selectedUserIds, record.PersonID]);
            } else {
              setSelectedUserIds(selectedUserIds.filter(id => id !== record.PersonID));
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      title: 'STT',
      width: 60,
      key: 'stt',
      render: (_: unknown, __: unknown, index: number) => (
        <span className="font-medium text-gray-900">{index + 1}</span>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'Email',
      key: 'Email',
      width: 200,
      render: (text: string) => <span className="font-medium text-gray-900">{text}</span>,
    },
    {
      title: 'Giới tính',
      dataIndex: 'Gender',
      key: 'Gender',
      width: 120,
      render: (gender: string) => (
        <Tag color={gender === 'Male' ? 'blue' : 'pink'} className="font-medium">
          {gender === 'Male' ? 'Nam' : 'Nữ'}
        </Tag>
      ),
    },
    {
      title: 'Số câu đã làm',
      dataIndex: 'TotalSentencesDone',
      key: 'TotalSentencesDone',
      width: 120,
      align: 'center' as const,
      sorter: (a: typeof users[number], b: typeof users[number]) => (a.TotalSentencesDone || 0) - (b.TotalSentencesDone || 0),
      render: (total: number, record: typeof users[number]) => (
        <Tag
          color="blue"
          className="font-medium cursor-pointer hover:opacity-80"
          onClick={() => handleShowSentences(record.Email, record.SentencesDone)}
        >
          {total || 0} câu
        </Tag>
      ),
    },
    {
      title: 'Tổng thời lượng',
      dataIndex: 'TotalRecordingDuration',
      key: 'TotalRecordingDuration',
      width: 140,
      align: 'center' as const,
      sorter: (a: typeof users[number], b: typeof users[number]) => (a.TotalRecordingDuration || 0) - (b.TotalRecordingDuration || 0),
      render: (duration: number) => (
        <Tag color="green" className="font-medium">
          {duration ? `${duration.toFixed(2)}s` : '0s'}
        </Tag>
      ),
    },
    {
      title: 'Số câu đóng góp',
      dataIndex: 'TotalContributedByUser',
      key: 'TotalContributedByUser',
      width: 130,
      align: 'center' as const,
      sorter: (a: typeof users[number], b: typeof users[number]) => (a.TotalContributedByUser || 0) - (b.TotalContributedByUser || 0),
      render: (total: number, record: typeof users[number]) => (
        <Tag
          color="purple"
          className="font-medium cursor-pointer hover:opacity-80"
          onClick={() => handleShowContributedSentences(record.Email, record.CreatedSentences)}
        >
          {total || 0} câu
        </Tag>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'CreatedAt',
      key: 'CreatedAt',
      width: 180,
      render: (date: string) => {
        if (!date) return '-';
        return new Date(date).toLocaleString('vi-VN');
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (_: unknown, record: typeof users[number]) => (
        <Space>
          <Popconfirm
            title="Xóa người dùng"
            description={`Bạn có chắc chắn muốn xóa người dùng "${record.Email}"?`}
            onConfirm={() => handleDeleteUser(record.PersonID, record.Email)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true, loading: deletingUser }}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              loading={deletingUser}
              size="small"
            >
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Thống kê từ API (đã được backend tính toán với bộ lọc ngày)
  const totalUsers = usersTotal;
  const maleCount = usersTotalMale;
  const femaleCount = usersTotalFemale;
  const totalSentencesDone = usersTotalCompletedSentences;
  const totalContributedByUsers = usersTotalContributedSentences;

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-h-screen bg-gray-50 py-8 px-4 md:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-3 py-4">
            <Title
              level={1}
              className="!mb-0 !text-4xl md:!text-5xl !font-bold !text-blue-600"
              style={{ letterSpacing: '-0.02em' }}
            >
              Quản Lý Người Dùng
            </Title>

          </div>

          {/* Statistics Grid (match Dashboard) */}
          <Row gutter={[12, 12]} className="mb-2">
            <Col xs={12} sm={12} md={4} lg={4}>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="text-xs text-gray-500 font-medium block mb-1">Tổng người dùng</Text>
                    <Text className="text-2xl font-bold text-blue-600">{totalUsers}</Text>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <TeamOutlined className="text-xl text-blue-600" />
                  </div>
                </div>
              </div>
            </Col>

            <Col xs={12} sm={12} md={4} lg={4}>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="text-xs text-gray-500 font-medium block mb-1">Nam</Text>
                    <Text className="text-2xl font-bold text-green-600">{maleCount}</Text>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <ManOutlined className="text-xl text-green-600" />
                  </div>
                </div>
              </div>
            </Col>

            <Col xs={12} sm={12} md={4} lg={4}>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-pink-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="text-xs text-gray-500 font-medium block mb-1">Nữ</Text>
                    <Text className="text-2xl font-bold text-pink-600">{femaleCount}</Text>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-pink-100 flex items-center justify-center">
                    <WomanOutlined className="text-xl text-pink-600" />
                  </div>
                </div>
              </div>
            </Col>

            <Col xs={12} sm={12} md={4} lg={4}>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="text-xs text-gray-500 font-medium block mb-1">Câu đã làm</Text>
                    <Text className="text-2xl font-bold text-purple-600">{totalSentencesDone}</Text>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <FileTextOutlined className="text-xl text-purple-600" />
                  </div>
                </div>
              </div>
            </Col>

            <Col xs={12} sm={12} md={4} lg={4}>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="text-xs text-gray-500 font-medium block mb-1">Câu đóng góp</Text>
                    <Text className="text-2xl font-bold text-amber-600">{totalContributedByUsers}</Text>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                    <TrophyOutlined className="text-xl text-amber-600" />
                  </div>
                </div>
              </div>
            </Col>
          </Row>

          {/* Users Table */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="space-y-4">
              <div>
                <Title level={3} className="!text-blue-600 !mb-2">
                  Danh sách người dùng
                </Title>

              </div>

              {/* Filters Section */}
              <div className="flex flex-wrap items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2">
                  <SearchOutlined className="text-blue-500 text-lg" />
                  <span className="font-medium text-gray-700">Lọc theo ngày recording :</span>
                </div>
                <div className="flex items-center gap-2">
                  <DatePicker.RangePicker
                    showTime={{ format: 'HH:mm' }}
                    format="DD/MM/YYYY HH:mm"
                    placeholder={['Từ ngày', 'Đến ngày']}
                    value={dateRange}
                    onChange={handleDateFilterChange}
                    className="w-[280px] !border-blue-300 !rounded-lg"
                    allowClear={false}
                  />
                </div>
                {dateRange[0] && dateRange[1] && (
                  <Button
                    type="text"
                    danger
                    icon={<CloseOutlined />}
                    onClick={handleClearDateFilter}
                    className="flex items-center gap-1 hover:!text-red-600"
                  >
                    Xóa lọc
                  </Button>
                )}
                <div className="flex items-center gap-2 border-l border-gray-300 pl-4">
                  <span className="font-medium text-gray-700">Lọc theo email:</span>
                  <Input
                    placeholder="Nhập email..."
                    value={emailFilter}
                    onChange={handleEmailFilterChange}
                    onPressEnter={handleApplyEmailFilter}
                    className="w-[220px] !border-blue-300 !rounded-lg"
                    allowClear
                  />
                  <Button
                    type="primary"
                    onClick={handleApplyEmailFilter}
                    className="!bg-blue-500"
                  >
                    Tìm
                  </Button>
                  {emailFilter && (
                    <Button
                      type="text"
                      danger
                      icon={<CloseOutlined />}
                      onClick={handleClearEmailFilter}
                      className="flex items-center gap-1 hover:!text-red-600"
                    >
                      Xóa
                    </Button>
                  )}
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <div className="text-sm text-gray-500">
                    {usersTotal > 0 ? (
                      <span className="text-blue-600 font-medium">{usersTotal} người dùng</span>
                    ) : (
                      <span className="text-gray-400 italic">Không có người dùng nào</span>
                    )}
                  </div>
                  <Button 
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={handleDownloadRecordings}
                    loading={downloadingRecordings}
                    className="!bg-green-600 !border-green-600 hover:!bg-green-700"
                  >
                    Download recording
                  </Button>
                </div>
              </div>


              {usersLoading ? (
                <div className="flex justify-center py-12">
                  <Spin size="large" />
                </div>
              ) : users.length > 0 ? (
                <div>
                  <Table
                    key={`table-${refreshKey}-${localPageSize}`}
                    columns={columns}
                    dataSource={users}
                    rowKey={(record, index) => `${record.PersonID}-${index}-${refreshKey}`}
                    pagination={{
                      pageSize: localPageSize,
                      showSizeChanger: false,
                      hideOnSinglePage: true,
                    }}
                    scroll={{ x: 800 }}
                  />
                  <div className="flex justify-end mt-4">
                    <Pagination
                      key={`pagination-${refreshKey}`}
                      current={usersPage}
                      pageSize={localPageSize}
                      total={usersTotal}
                      pageSizeOptions={[10, 20, 50, 100]}
                      showSizeChanger
                      onChange={(page, pageSize) => {
                        // Cập nhật local state ngay lập tức để UI hiển thị đúng
                        setLocalPageSize(pageSize);
                        
                        // Force re-render
                        setRefreshKey(prev => prev + 1);
                        
                        const fromDate = dateRange[0] ? dateRange[0].toISOString() : undefined;
                        const toDate = dateRange[1] ? dateRange[1].toISOString() : undefined;
                        const email = emailFilter.trim() ? emailFilter.trim() : undefined;
                        
                        dispatch(fetchUsers({ 
                          page: pageSize !== localPageSize ? 1 : page, 
                          limit: pageSize, 
                          fromDate, 
                          toDate,
                          email,
                        }));
                      }}
                      showTotal={(total, range) => `${range[0]}-${range[1]} của ${total} người dùng`}
                    />
                  </div>
                </div>
              ) : (
                <Empty description="Chưa có người dùng nào" style={{ marginTop: 50 }} />
              )}
            </div>
          </div>

          {/* Top Recorders */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="space-y-4">
              <div>
                <Title level={3} className="!text-amber-600 !mb-2 flex items-center gap-2">
                  <TrophyOutlined />
                  Top Những Người Ghi Âm
                </Title>
                <Text className="text-gray-600">
                  Danh sách 6 người ghi âm nhiều nhất trong hệ thống
                </Text>
              </div>

              {loadingTopRecorders ? (
                <div className="flex justify-center py-12">
                  <Spin size="large" />
                </div>
              ) : topRecorders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topRecorders.map((recorder, index) => (
                    <div
                      key={recorder.userId}
                      className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200 hover:shadow-md transition-shadow"
                    >
                      {/* Rank Badge */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${index === 0
                              ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                              : index === 1
                                ? 'bg-gradient-to-r from-gray-400 to-gray-500'
                                : index === 2
                                  ? 'bg-gradient-to-r from-orange-400 to-orange-500'
                                  : 'bg-gray-400'
                              }`}
                          >
                            {index + 1}
                          </span>
                          <span className="text-xs font-semibold text-amber-700">
                            {index === 0 ? 'Vàng' : index === 1 ? 'Bạc' : index === 2 ? 'Đồng' : `#${index + 1}`}
                          </span>
                        </div>
                      </div>

                      {/* User Info */}
                      <div className="space-y-2">
                        <h4 className="font-bold text-gray-900 text-sm">{recorder.email}</h4>
                        <div className="flex items-center gap-2">
                          <Tag
                            color={recorder.gender === 'Male' ? 'blue' : 'pink'}
                            className="font-medium text-xs"
                          >
                            {recorder.gender === 'Male' ? 'Nam' : 'Nữ'}
                          </Tag>
                        </div>

                        {/* Stats */}
                        <div className="bg-white rounded-lg p-2 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Tổng bản ghi:</span>
                            <span className="font-bold text-amber-600">
                              {recorder.totalRecordings}
                            </span>
                          </div>
                          {recorder.approvedRecordings !== undefined && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">Đã duyệt:</span>
                              <span className="font-bold text-green-600">
                                {recorder.approvedRecordings}
                              </span>
                            </div>
                          )}
                          {recorder.rejectedRecordings !== undefined && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">Từ chối:</span>
                              <span className="font-bold text-red-600">
                                {recorder.rejectedRecordings}
                              </span>
                            </div>
                          )}
                          {recorder.pendingRecordings !== undefined && recorder.pendingRecordings > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">Chờ duyệt:</span>
                              <span className="font-bold text-blue-600">
                                {recorder.pendingRecordings}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty description="Chưa có dữ liệu ghi âm" style={{ marginTop: 50 }} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal hiển thị danh sách câu đã làm */}
      <Modal
        title={`Danh sách câu đã làm - ${selectedUserName}`}
        open={sentencesModalVisible}
        onCancel={() => {
          setSentencesModalVisible(false);
          setSentencesModalPage(1);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setSentencesModalVisible(false);
            setSentencesModalPage(1);
          }}>
            Đóng
          </Button>
        ]}
        width={800}
      >
        {selectedUserSentences.length > 0 ? (
          <>
            <div className="space-y-3">
              {selectedUserSentences
                .slice((sentencesModalPage - 1) * sentencesModalPageSize, sentencesModalPage * sentencesModalPageSize)
                .map((sentence, index) => (
                  <div
                    key={sentence.SentenceID}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">{(sentencesModalPage - 1) * sentencesModalPageSize + index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium mb-2">{sentence.Content}</p>
                        <div className="space-y-2">
                          {sentence.RecordedAt && (
                            <p className="text-xs text-gray-400">
                              Ghi âm: {new Date(sentence.RecordedAt).toLocaleString('vi-VN')}
                            </p>
                          )}
                          {sentence.Duration && (
                            <p className="text-xs text-gray-400">
                              Thời lượng: {sentence.Duration.toFixed(2)}s
                            </p>
                          )}
                          {sentence.AudioUrl && (
                            <div className="mt-2">
                              <audio controls className="w-full" style={{ maxWidth: '100%' }}>
                                <source src={sentence.AudioUrl} type="audio/webm" />
                                <source src={sentence.AudioUrl} type="audio/mpeg" />
                                <source src={sentence.AudioUrl} type="audio/wav" />
                                Trình duyệt của bạn không hỗ trợ phát audio.
                              </audio>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            {selectedUserSentences.length > sentencesModalPageSize && (
              <div className="mt-4 flex justify-center">
                <Pagination
                  current={sentencesModalPage}
                  pageSize={sentencesModalPageSize}
                  total={selectedUserSentences.length}
                  onChange={(page) => setSentencesModalPage(page)}
                  showSizeChanger={false}
                  showQuickJumper={false}
                />
              </div>
            )}
          </>
        ) : (
          <Empty description="Chưa có câu nào được hoàn thành" />
        )}
      </Modal>

      {/* Modal hiển thị danh sách câu đóng góp */}
      <Modal
        title={`Danh sách câu đóng góp - ${selectedContributorName}`}
        open={contributedSentencesModalVisible}
        onCancel={() => {
          setContributedSentencesModalVisible(false);
          setContributedSentencesModalPage(1);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setContributedSentencesModalVisible(false);
            setContributedSentencesModalPage(1);
          }}>
            Đóng
          </Button>
        ]}
        width={800}
      >
        {selectedUserContributedSentences.length > 0 ? (
          <>
            <div className="space-y-3">
              {selectedUserContributedSentences
                .slice((contributedSentencesModalPage - 1) * contributedSentencesModalPageSize, contributedSentencesModalPage * contributedSentencesModalPageSize)
                .map((sentence, index) => (
                  <div
                    key={sentence.SentenceID}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-semibold text-sm">{(contributedSentencesModalPage - 1) * contributedSentencesModalPageSize + index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium mb-1">{sentence.Content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Tag color={sentence.Status === 1 ? 'green' : sentence.Status === 2 ? 'red' : 'blue'} className="text-xs">
                            {sentence.Status === 1 ? 'Đã duyệt' : sentence.Status === 2 ? 'Từ chối' : 'Chờ duyệt'}
                          </Tag>
                          <span className="text-xs text-gray-400">
                            {new Date(sentence.CreatedAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            {selectedUserContributedSentences.length > contributedSentencesModalPageSize && (
              <div className="mt-4 flex justify-center">
                <Pagination
                  current={contributedSentencesModalPage}
                  pageSize={contributedSentencesModalPageSize}
                  total={selectedUserContributedSentences.length}
                  onChange={(page) => setContributedSentencesModalPage(page)}
                  showSizeChanger={false}
                  showQuickJumper={false}
                />
              </div>
            )}
          </>
        ) : (
          <Empty description="Chưa có câu nào được đóng góp" />
        )}
      </Modal>

      {/* Modal hiển thị danh sách tất cả người dùng */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedUserIds.length === users.length && users.length > 0}
              indeterminate={selectedUserIds.length > 0 && selectedUserIds.length < users.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedUserIds(users.map(u => u.PersonID));
                } else {
                  setSelectedUserIds([]);
                }
              }}
            />
            <span>Danh Sách Tất Cả Người Dùng</span>
          </div>
        }
        open={allUsersModalVisible}
        onCancel={() => {
          setAllUsersModalVisible(false);
          setAllUsersModalPage(1);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setAllUsersModalVisible(false);
            setAllUsersModalPage(1);
          }}>
            Đóng
          </Button>
        ]}
        width={900}
      >
        {users.length > 0 ? (
          <>
            <div className="space-y-3">
              {users
                .slice((allUsersModalPage - 1) * allUsersModalPageSize, allUsersModalPage * allUsersModalPageSize)
                .map((user, index) => (
                  <div
                    key={user.PersonID}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (selectedUserIds.includes(user.PersonID)) {
                        setSelectedUserIds(selectedUserIds.filter(id => id !== user.PersonID));
                      } else {
                        setSelectedUserIds([...selectedUserIds, user.PersonID]);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <Checkbox
                          checked={selectedUserIds.includes(user.PersonID)}
                          onChange={() => {
                            if (selectedUserIds.includes(user.PersonID)) {
                              setSelectedUserIds(selectedUserIds.filter(id => id !== user.PersonID));
                            } else {
                              setSelectedUserIds([...selectedUserIds, user.PersonID]);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">{(allUsersModalPage - 1) * allUsersModalPageSize + index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 font-bold">{user.Email}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <Tag color={user.Gender === 'Male' ? 'blue' : 'pink'}>
                            {user.Gender === 'Male' ? '♂️ Nam' : '♀️ Nữ'}
                          </Tag>
                          <span className="text-xs text-gray-600">
                            📝 Hoàn thành: {user.TotalSentencesDone || 0} câu
                          </span>
                          <span className="text-xs text-gray-600">
                            ⏱️ Thời lượng: {user.TotalRecordingDuration?.toFixed(2) || 0}s
                          </span>
                          <span className="text-xs text-gray-600">
                            🎯 Đóng góp: {user.TotalContributedByUser || 0} câu
                          </span>
                          <span className="text-xs text-gray-500">
                            📅 {user.CreatedAt ? new Date(user.CreatedAt).toLocaleDateString('vi-VN') : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            {users.length > allUsersModalPageSize && (
              <div className="mt-4 flex justify-center">
                <Pagination
                  current={allUsersModalPage}
                  pageSize={allUsersModalPageSize}
                  total={users.length}
                  onChange={(page) => setAllUsersModalPage(page)}
                  showSizeChanger={false}
                  showQuickJumper={false}
                />
              </div>
            )}
          </>
        ) : (
          <Spin spinning={usersLoading}>
            <Empty description="Không có người dùng nào" />
          </Spin>
        )}
      </Modal>
    </div>
  );
};

export default ManagerUsers;
