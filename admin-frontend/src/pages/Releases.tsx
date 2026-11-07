import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Checkbox, DatePicker, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import api from '../services/api';
import AdminPageHeader from '../components/AdminPageHeader';
import './Releases.css';
import dayjs, { type Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

type Notice = { id:number; version:string; audience:string; title:string; content:string; important:boolean; publishedAt:string|null };
type Values = Pick<Notice,'version'|'audience'|'title'|'content'|'important'> & {publishMode:'draft'|'now'|'scheduled'; scheduleTime?:Dayjs};
const audiences = [{value:'all',label:'全部用户'},{value:'client',label:'客户端'},{value:'technician',label:'美甲师端'}];
export default function Releases() {
  const [rows,setRows]=useState<Notice[]>([]),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false);
  const [editing,setEditing]=useState<Notice|null>(null),[open,setOpen]=useState(false);
  const [form]=Form.useForm<Values>();
  const load=useCallback(async()=>{
    setLoading(true);
    try { const result=await api.get<Notice[]>('/releases');setRows(result.data); }
    catch { message.error('更新说明加载失败，请重试'); }
    finally {setLoading(false);}
  },[]);
  useEffect(()=>{void load();const timer=window.setInterval(()=>void load(),60000);return()=>window.clearInterval(timer);},[load]);
  const edit=(row?:Notice)=>{
    setEditing(row||null);form.resetFields();
    form.setFieldsValue(row ? {...row,publishMode:row.publishedAt ? (dayjs(row.publishedAt).isAfter(dayjs()) ? 'scheduled' : 'now') : 'draft',scheduleTime:row.publishedAt ? dayjs(row.publishedAt).utcOffset(8) : undefined} : {publishMode:'draft',audience:'all',important:true});setOpen(true);
  };
  const save=async()=>{
    if(saving)return;
    let values:Values;
    try { values=await form.validateFields(); } catch { return; }
    setSaving(true);
    try { const {publishMode,scheduleTime,...fields}=values;
      const payload={...fields,published:publishMode!=='draft',...(publishMode==='scheduled' ? {scheduledFor:scheduleTime!.format('YYYY-MM-DDTHH:mm:ss')+'+08:00'} : {})};
      if(editing)await api.put('/releases/'+editing.id,payload);else await api.post('/releases',payload);
      message.success(values.publishMode==='scheduled'?'已安排定时发布':values.publishMode==='now'?'更新说明已发布':'草稿已保存');setOpen(false);await load();
    } catch(error) { const e=error as {response?:{data?:{message?:string}}};message.error(e.response?.data?.message||'保存失败，请重试'); }
    finally {setSaving(false);}
  };
  return <div className="release-settings">
    <AdminPageHeader title="版本与更新通知" description="维护客户端与美甲师端更新说明、发布状态和首次提醒与定时发布" />
    <Alert type="info" showIcon message="小程序代码需先在微信发布，再发布对应版本的更新说明。这里不会上传或发布小程序代码，也不会向未打开小程序的用户推送微信消息。" style={{marginBottom:16}} />
    <Space style={{marginBottom:16}}><Button type="primary" onClick={()=>edit()}>新增更新说明</Button><Button onClick={()=>void load()}>刷新</Button></Space>
    <Table rowKey="id" loading={loading} dataSource={rows} pagination={{pageSize:10}} scroll={{x:750}} columns={[
      {title:'版本',dataIndex:'version'}, {title:'标题',dataIndex:'title'},
      {title:'用户',dataIndex:'audience',render:value=>audiences.find(a=>a.value===value)?.label},
      {title:'状态',render:(_,row)=><Tag>{row.publishedAt ? (dayjs(row.publishedAt).isAfter(dayjs())?'待定时发布':'已发布') : '草稿'}</Tag>},
      {title:'发布时间（北京时间）',dataIndex:'publishedAt',render:value=>value?dayjs(value).utcOffset(8).format('YYYY-MM-DD HH:mm'):'—'},
      {title:'首次提醒',dataIndex:'important',render:value=>value?'开启':'仅更新记录'},
      {title:'操作',render:(_,row)=><Button onClick={()=>edit(row)}>编辑 / 撤回</Button>},
    ]}/>
    <Modal className="release-editor" title={editing?'编辑更新说明':'新增更新说明'} open={open} onCancel={()=>{if(!saving)setOpen(false);}} onOk={()=>void save()} confirmLoading={saving} okText="保存" cancelText="取消" destroyOnClose>
      <Form form={form} layout="vertical" disabled={saving}>
        <Form.Item name="version" label="小程序版本" rules={[{required:true,pattern:/^\d{1,4}\.\d{1,4}\.\d{1,4}$/,message:'填写微信正式版本，例如 1.2.0'}]}><Input placeholder="例如 1.2.0" maxLength={14}/></Form.Item>
        <Form.Item name="audience" label="适用用户" rules={[{required:true}]}><Select options={audiences}/></Form.Item>
        <Form.Item name="title" label="标题" rules={[{required:true,whitespace:true}]}><Input maxLength={80}/></Form.Item>
        <Form.Item name="content" label="更新内容" rules={[{required:true,whitespace:true}]}><Input.TextArea rows={7} maxLength={4000} showCount placeholder="按行说明对用户有用的变化"/></Form.Item>
        <Form.Item name="important" label="首次进入对应版本时提醒" valuePropName="checked"><Checkbox>开启</Checkbox></Form.Item>
        <Form.Item name="publishMode" label="发布方式" rules={[{required:true}]}><Select options={[{value:'draft',label:'草稿 / 取消发布计划'},{value:'now',label:'立即发布'},{value:'scheduled',label:'定时发布'}]}/></Form.Item>
        <Form.Item noStyle shouldUpdate={(prev,next)=>prev.publishMode!==next.publishMode}>{({getFieldValue})=>getFieldValue('publishMode')==='scheduled' ? <Form.Item name="scheduleTime" label="计划发布时间（北京时间）" rules={[{required:true,message:'请选择发布时间'},{validator:(_,value)=>!value || dayjs(value.format('YYYY-MM-DDTHH:mm:ss')+'+08:00').isAfter(dayjs()) ? Promise.resolve() : Promise.reject(new Error('请选择未来时间'))}]}><DatePicker showTime format="YYYY-MM-DD HH:mm" style={{width:'100%'}}/></Form.Item> : null}</Form.Item>
      </Form>
    </Modal>
  </div>;
}
