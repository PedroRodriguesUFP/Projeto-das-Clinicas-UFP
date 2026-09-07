import React, { useState, useEffect } from 'react';
import { getStaffUsers, toggleUserActive, updateUserProfile } from '../services/admin';
import { useNavigate } from 'react-router-dom';

export function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ nome: '', role: '' });
  const navigate = useNavigate();

  useEffect(() => {
    carregarUsers();
  }, []);

  const carregarUsers = async () => {
    try {
      const data = await getStaffUsers();
      setUsers(data);
    } catch (error) {
      console.error("Erro ao carregar utilizadores", error);
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await toggleUserActive(id);
      carregarUsers();
    } catch (error) {
      alert(error.response?.data?.error || "Erro ao alterar estado.");
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditForm({ nome: user.nome, role: user.role });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await updateUserProfile(editingUser.id, editForm);
      setEditingUser(null);
      carregarUsers();
    } catch (error) {
      alert("Erro ao atualizar o perfil.");
    }
  };

  // Redireciona para as consultas dependendo se é utente ou terapeuta
  const verConsultas = (user) => {
    if (user.role === 'utente') {
      navigate(`/utentes/${user.id}/consultas`);
    } else {
      // Caso tenhas uma página que filtre a lista de consultas por terapeuta
      navigate(`/consultas?terapeutaId=${user.id}`);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Gestão de Utilizadores (Admin)</h2>
      
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-4">Nome</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Estado</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="p-4">{user.nome}</td>
                <td className="p-4">{user.email}</td>
                <td className="p-4 capitalize">{user.role}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-sm ${user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {user.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="p-4 flex justify-center gap-2">
                  <button onClick={() => verConsultas(user)} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded">
                    Consultas
                  </button>
                  <button onClick={() => handleEditClick(user)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">
                    Editar
                  </button>
                  <button onClick={() => handleToggleActive(user.id)} className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded">
                    {user.active ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-xl font-semibold mb-4">Editar Perfil</h3>
            <form onSubmit={handleSaveEdit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Nome:</label>
                <input 
                  type="text" 
                  value={editForm.nome}
                  onChange={(e) => setEditForm({...editForm, nome: e.target.value})}
                  className="w-full border rounded p-2"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1">Role:</label>
                <select 
                  value={editForm.role}
                  onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                  className="w-full border rounded p-2"
                >
                  <option value="utente">Utente</option>
                  <option value="terapeuta">Terapeuta</option>
                  <option value="administrativo">Administrativo</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}